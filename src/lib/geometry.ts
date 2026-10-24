import * as turf from '@turf/turf';
import type { NwsGeometry, NwsAlertFeature } from '@/types/nws';
import type { ValidGeometry, ImpactResult, GeoPoint, HazardCategory, NormalizedAlert } from '@/types/domain';

/**
 * Geometry validation. NWS polygons are [lng, lat] GeoJSON rings.
 * We validate ring closure and minimum ring length before trusting them
 * for point-in-polygon work. Invalid geometry is rejected explicitly —
 * the app never fabricates a polygon from a county/zone description.
 */

function ringIsClosed(ring: number[][]): boolean {
  if (ring.length < 4) return false; // min 3 unique points + closing vertex
  const a = ring[0];
  const b = ring[ring.length - 1];
  return a[0] === b[0] && a[1] === b[1];
}

function allRingsClosed(rings: number[][][]): boolean {
  return rings.length > 0 && rings.every((r) => ringIsClosed(r));
}

/** Validate and normalize NWS geometry into a trusted shape, or null if invalid. */
export function validateGeometry(geom: NwsGeometry | null | undefined): ValidGeometry | null {
  if (!geom) return null;

  if (geom.type === 'Polygon') {
    const coords = geom.coordinates;
    if (!Array.isArray(coords) || !allRingsClosed(coords)) return null;
    return { kind: 'Polygon', coordinates: coords };
  }

  if (geom.type === 'MultiPolygon') {
    const polys = geom.coordinates;
    if (!Array.isArray(polys) || polys.length === 0) return null;
    if (!polys.every((poly) => Array.isArray(poly) && allRingsClosed(poly))) return null;
    return { kind: 'MultiPolygon', coordinates: polys };
  }

  return null;
}

/** Convert a ValidGeometry back to a plain GeoJSON geometry for Leaflet/Turf. */
export function toGeoJSONGeometry(g: ValidGeometry): NwsGeometry {
  if (g.kind === 'Polygon') return { type: 'Polygon', coordinates: g.coordinates };
  return { type: 'MultiPolygon', coordinates: g.coordinates };
}

/**
 * Determine whether a point is inside the supplied boundary.
 * Handles Polygon (with holes) and MultiPolygon. Returns one of three
 * explicit states: inside, outside, or unknown (when geometry is absent
 * or invalid, or the point itself is malformed).
 */
export function computeImpact(point: GeoPoint | null, geom: ValidGeometry | null): ImpactResult {
  if (!point) {
    return {
      state: 'unknown',
      reason: 'Select a location to compare it with the supplied alert boundary.',
      matchedRingIndex: null,
    };
  }

  if (!geom) {
    return {
      state: 'unknown',
      reason:
        'No validated boundary geometry is available for this alert. The affected area is described only in words, so AlertLens cannot determine point-level impact.',
      matchedRingIndex: null,
    };
  }

  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    return {
      state: 'unknown',
      reason: 'The selected location is not precise enough to test against the alert boundary.',
      matchedRingIndex: null,
    };
  }

  const pt = turf.point([point.lng, point.lat]);

  if (geom.kind === 'Polygon') {
    const result = testPolygon(pt, geom.coordinates);
    return finalize(result, 'Polygon');
  }

  // MultiPolygon — point is inside if any constituent polygon contains it.
  for (let i = 0; i < geom.coordinates.length; i++) {
    const result = testPolygon(pt, geom.coordinates[i]);
    if (result.state === 'inside') {
      return {
        state: 'inside',
        reason: `The selected location lies inside a validated boundary of this alert (part ${i + 1} of ${geom.coordinates.length}).`,
        matchedRingIndex: i,
      };
    }
  }
  return {
    state: 'outside',
    reason:
      'The selected location lies outside all validated boundaries supplied for this alert. Being outside a supplied boundary does not guarantee safety — hazards can occur nearby or outside the drawn area.',
    matchedRingIndex: null,
  };
}

function finalize(
  result: { state: 'inside' | 'outside'; ringIndex: number },
  kind: string,
): ImpactResult {
  if (result.state === 'inside') {
    return {
      state: 'inside',
      reason: `The selected location lies inside the validated ${kind.toLowerCase()} boundary supplied for this alert.`,
      matchedRingIndex: result.ringIndex,
    };
  }
  return {
    state: 'outside',
    reason:
      'The selected location lies outside the validated boundary supplied for this alert. Being outside a supplied boundary does not guarantee safety — hazards can occur nearby or outside the drawn area.',
    matchedRingIndex: null,
  };
}

/** Test a point against a polygon with Turf, respecting holes. */
function testPolygon(
  pt: import('geojson').Feature<import('geojson').Point>,
  rings: number[][][],
): { state: 'inside' | 'outside'; ringIndex: number } {
  // Turf booleanPointInPolygon treats the first ring as the outer boundary
  // and subsequent rings as holes — which matches GeoJSON semantics.
  const poly = turf.polygon(rings);
  const insideOuter = turf.booleanPointInPolygon(pt, poly);
  if (!insideOuter) return { state: 'outside', ringIndex: 0 };

  // Explicit hole check: if the point falls inside any hole, it is outside.
  for (let h = 1; h < rings.length; h++) {
    const hole = turf.polygon([rings[h]]);
    if (turf.booleanPointInPolygon(pt, hole)) {
      return { state: 'outside', ringIndex: h };
    }
  }
  return { state: 'inside', ringIndex: 0 };
}

/** Compute a bounding box for fitting the map to an alert. Returns [lng,lat] corners. */
export function geometryBounds(geom: ValidGeometry): [[number, number], [number, number]] | null {
  try {
    const gj = toGeoJSONGeometry(geom);
    const fc = turf.featureCollection([turf.feature(gj)]);
    const bbox = turf.bbox(fc);
    return [
      [bbox[0], bbox[1]],
      [bbox[2], bbox[3]],
    ];
  } catch {
    return null;
  }
}

/** Map an NWS event name to a hazard category for color/icons. */
export function classifyHazard(event: string): HazardCategory {
  const e = event.toLowerCase();
  if (e.includes('tornado')) return 'tornado';
  if (e.includes('flood') || e.includes('flash flood') || e.includes('coastal flood') || e.includes('hydro')) {
    return 'flood';
  }
  if (
    e.includes('thunder') ||
    e.includes('lightning') ||
    e.includes('severe weather') ||
    e.includes('wind') ||
    e.includes('fire weather') ||
    e.includes('red flag')
  ) {
    return 'thunder';
  }
  if (
    e.includes('winter') ||
    e.includes('snow') ||
    e.includes('ice') ||
    e.includes('blizzard') ||
    e.includes('sleet') ||
    e.includes('freeze') ||
    e.includes('frost')
  ) {
    return 'winter';
  }
  return 'general';
}

/**
 * An alert is no longer current once either the source message expires or the
 * stated hazard end time passes. These are different NWS fields; use the
 * earlier valid timestamp instead of letting a later "ends" value keep an
 * expired message on screen.
 */
export function isAlertExpired(alert: NormalizedAlert, now: Date = new Date()): boolean {
  const cutoffs = [alert.expires, alert.ends].filter((d): d is Date => d instanceof Date && Number.isFinite(d.getTime()));
  if (cutoffs.length === 0) return false;
  return Math.min(...cutoffs.map((d) => d.getTime())) <= now.getTime();
}

/** NWS active feeds can include alerts whose effective/onset time is still ahead. */
export function isAlertUpcoming(alert: NormalizedAlert, now: Date = new Date()): boolean {
  const start = alert.onset ?? alert.effective;
  return !isAlertExpired(alert, now) && !!start && start.getTime() > now.getTime();
}

/** Filter alerts to those whose geometry contains the point (overlapping alerts). */
export function alertsContainingPoint(
  alerts: NwsAlertFeature[],
  point: GeoPoint,
): NwsAlertFeature[] {
  return alerts.filter((a) => {
    const g = validateGeometry(a.geometry);
    if (!g) return false;
    return computeImpact(point, g).state === 'inside';
  });
}
