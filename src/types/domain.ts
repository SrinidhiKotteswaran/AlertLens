import type {
  NwsAlertCollection,
  NwsAlertFeature,
  NwsAlertProperties,
  NwsGeometry,
  NwsPointsResponse,
  NwsObservationResponse,
} from '@/types/nws';

/** A normalized, app-facing alert with validated geometry and derived metadata. */
export interface NormalizedAlert {
  id: string;
  rawId: string;
  event: string;
  headline: string | null;
  description: string | null;
  instruction: string | null;
  areaDesc: string;
  severity: NwsAlertProperties['severity'];
  urgency: NwsAlertProperties['urgency'];
  certainty: NwsAlertProperties['certainty'];
  sent: Date;
  effective: Date | null;
  onset: Date | null;
  expires: Date | null;
  ends: Date | null;
  updated: Date | null;
  status: string;
  messageType: string;
  response: string | null;
  web: string | null;
  /** Validated polygon geometry in [lng, lat] order, or null when absent/invalid. */
  geometry: ValidGeometry | null;
  /** True when NWS supplied geometry we could validate; false when only areaDesc exists. */
  hasGeometry: boolean;
  /** Plain-English hazard category used for color/icons. */
  hazardCategory: HazardCategory;
  /** Plain-English summary derived deterministically from source fields. */
  summary: string;
  /** What AlertLens can and cannot establish about this alert. */
  caveats: string[];
  /** Stable signature of "interesting" fields, used for timeline change detection. */
  signature: string;
  /** Source timestamps preserved verbatim for display. */
  sourceSentIso: string;
  sourceUpdatedIso: string | null;
  sourceExpiresIso: string | null;
  sourceEffectiveIso: string | null;
}

export type HazardCategory =
  | 'tornado'
  | 'flood'
  | 'thunder'
  | 'winter'
  | 'general';

export type ValidGeometry =
  | { kind: 'Polygon'; coordinates: number[][][] }
  | { kind: 'MultiPolygon'; coordinates: number[][][][] };

export type ImpactState = 'inside' | 'outside' | 'unknown';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeocodedPlace {
  id: string;
  label: string;
  lat: number;
  lng: number;
  source: string;
  raw: unknown;
}

export interface ObservationSummary {
  stationId: string;
  stationName: string;
  timestamp: Date | null;
  temperatureC: number | null;
  windKph: number | null;
  windDirectionDeg: number | null;
  humidityPct: number | null;
  precipitationMm: number | null;
  description: string | null;
  /** ISO timestamp string from the source, preserved. */
  sourceTimestampIso: string | null;
}

export interface TimelineEntry {
  alertId: string;
  observedAt: Date;
  changeType:
    | 'new'
    | 'updated'
    | 'expires_changed'
    | 'instruction_changed'
    | 'severity_changed'
    | 'certainty_changed'
    | 'not_returned'
    | 'no_change';
  summary: string;
  sourceTimestampIso: string | null;
}

export interface DataStatus {
  lastSuccessfulFetch: Date | null;
  lastFetchError: string | null;
  isStale: boolean;
  /** True when the last fetch succeeded with a 2xx response. */
  ok: boolean;
}

export type SimulationScenarioId = 'tornado' | 'flash-flood' | 'severe-thunder';

export interface SimulationScenario {
  id: SimulationScenarioId;
  title: string;
  description: string;
  location: GeoPoint;
  locationLabel: string;
  alert: NwsAlertFeature;
  observation: ObservationSummary | null;
  walkthrough: string[];
}

/** Result of a point-in-polygon check against an alert's valid geometry. */
export interface ImpactResult {
  state: ImpactState;
  /** Why this state was chosen — surfaced in the UI for transparency. */
  reason: string;
  /** Which polygon ring matched, for debugging display. */
  matchedRingIndex: number | null;
}

/** Re-export raw API types used elsewhere. */
export type {
  NwsAlertCollection,
  NwsAlertFeature,
  NwsAlertProperties,
  NwsGeometry,
  NwsPointsResponse,
  NwsObservationResponse,
};
