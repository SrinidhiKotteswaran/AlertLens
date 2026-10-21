import type { NwsAlertFeature } from '@/types/nws';
import type { SimulationScenario, ObservationSummary, GeoPoint } from '@/types/domain';

/**
 * Simulation Lab fixtures.
 *
 * Every scenario is SYNTHETIC — clearly labeled. Geometry is illustrative
 * and not from a live NWS alert. Fixtures are shaped to match the real
 * api.weather.gov schema so the same normalization/geometry/explanation
 * pipeline exercises them exactly as live data would.
 */

const TORNADO_LOCATION: GeoPoint = { lat: 35.222, lng: -97.432 };

// A synthetic triangular polygon near Oklahoma City — clearly illustrative.
const TORNADO_POLYGON: number[][][] = [
  [
    [-97.55, 35.3],
    [-97.3, 35.3],
    [-97.35, 35.1],
    [-97.55, 35.3],
  ],
];

const tornadoAlert: NwsAlertFeature = {
  id: 'sim-tornado-warning-0001',
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: TORNADO_POLYGON },
  properties: {
    id: 'sim-tornado-warning-0001',
    areaDesc: 'Central Oklahoma, including portions of Cleveland and Oklahoma counties',
    event: 'Tornado Warning',
    headline: 'Tornado Warning issued until 4:45 PM CDT for central Oklahoma',
    description:
      'At 3:42 PM CDT, a confirmed tornado was located near central Oklahoma, moving northeast at 35 mph. This is a dangerous storm. TAKE COVER NOW.',
    instruction:
      'TAKE COVER NOW! Move to a basement or an interior room on the lowest floor of a sturdy building. Avoid windows. If you are outdoors, in a mobile home, or in a vehicle, move to the closest substantial shelter and protect yourself from flying debris.',
    severity: 'Severe',
    certainty: 'Observed',
    urgency: 'Immediate',
    sent: '2026-10-18T20:42:00Z',
    effective: '2026-10-18T20:42:00Z',
    onset: '2026-10-18T20:42:00Z',
    expires: '2026-10-18T21:45:00Z',
    ends: '2026-10-18T21:45:00Z',
    updated: '2026-10-18T20:42:00Z',
    status: 'Actual',
    messageType: 'Alert',
    category: 'Met',
    response: 'Shelter',
    web: 'https://www.weather.gov/safety/tornado',
  },
};

const tornadoObservation: ObservationSummary = {
  stationId: 'KOKC',
  stationName: 'Oklahoma City, Will Rogers World Airport',
  timestamp: new Date('2026-10-18T20:40:00Z'),
  temperatureC: 24,
  windKph: 41,
  windDirectionDeg: 220,
  humidityPct: 71,
  precipitationMm: 0,
  description: 'Thunderstorm in vicinity',
  sourceTimestampIso: '2026-10-18T20:40:00Z',
};

// Flash flood — MultiPolygon, near Austin, TX
const FLOOD_LOCATION: GeoPoint = { lat: 30.267, lng: -97.743 };
const FLOOD_POLYGON: number[][][][] = [
  [
    [
      [-97.85, 30.32],
      [-97.65, 30.32],
      [-97.65, 30.22],
      [-97.85, 30.22],
      [-97.85, 30.32],
    ],
  ],
  [
    [
      [-97.6, 30.2],
      [-97.5, 30.2],
      [-97.5, 30.1],
      [-97.6, 30.1],
      [-97.6, 30.2],
    ],
  ],
];

const flashFloodAlert: NwsAlertFeature = {
  id: 'sim-flash-flood-warning-0001',
  type: 'Feature',
  geometry: { type: 'MultiPolygon', coordinates: FLOOD_POLYGON },
  properties: {
    id: 'sim-flash-flood-warning-0001',
    areaDesc: 'Travis County, Texas, including Austin metro',
    event: 'Flash Flood Warning',
    headline: 'Flash Flood Warning for Travis County until 11:30 PM CDT',
    description:
      'Heavy rainfall has produced 3 to 5 inches of rain since 7 PM. Flash flooding is occurring or imminent. Rapid rises on creeks and low-water crossings are expected. Do not drive through flooded roads.',
    instruction:
      'Turn Around, Don\'t Drown. Never drive through flooded roadways. Move to higher ground immediately if you are in a flood-prone area. Avoid creeks, draws, and low-water crossings.',
    severity: 'Severe',
    certainty: 'Likely',
    urgency: 'Expected',
    sent: '2026-10-18T02:10:00Z',
    effective: '2026-10-18T02:10:00Z',
    onset: '2026-10-18T02:10:00Z',
    expires: '2026-10-18T04:30:00Z',
    ends: '2026-10-18T04:30:00Z',
    updated: '2026-10-18T02:40:00Z',
    status: 'Actual',
    messageType: 'Update',
    category: 'Met',
    response: 'Avoid',
    web: 'https://www.weather.gov/safety/flood',
  },
};

const flashFloodObservation: ObservationSummary = {
  stationId: 'KAUS',
  stationName: 'Austin Bergstrom International Airport',
  timestamp: new Date('2026-10-18T02:35:00Z'),
  temperatureC: 19,
  windKph: 18,
  windDirectionDeg: 150,
  humidityPct: 94,
  precipitationMm: 12.7,
  description: 'Heavy rain',
  sourceTimestampIso: '2026-10-18T02:35:00Z',
};

// Severe thunderstorm — polygon WITH a hole, near Denver
const TSTORM_LOCATION: GeoPoint = { lat: 39.74, lng: -104.99 };
const TSTORM_POLYGON: number[][][] = [
  [
    // outer ring
    [-105.1, 39.82],
    [-104.85, 39.82],
    [-104.85, 39.66],
    [-105.1, 39.66],
    [-105.1, 39.82],
  ],
  [
    // hole — a "gap" in the warned area (illustrative only)
    [-105.0, 39.76],
    [-104.95, 39.76],
    [-104.95, 39.72],
    [-105.0, 39.72],
    [-105.0, 39.76],
  ],
];

const severeThunderAlert: NwsAlertFeature = {
  id: 'sim-severe-thunderstorm-warning-0001',
  type: 'Feature',
  geometry: { type: 'Polygon', coordinates: TSTORM_POLYGON },
  properties: {
    id: 'sim-severe-thunderstorm-warning-0001',
    areaDesc: 'Denver metropolitan area, Colorado',
    event: 'Severe Thunderstorm Warning',
    headline: 'Severe Thunderstorm Warning for Denver until 5:15 PM MDT',
    description:
      'At 4:10 PM MDT, a severe thunderstorm was located over the Denver metro, moving east at 20 mph. Wind gusts up to 70 mph and half-dollar size hail are possible.',
    instruction:
      'Remain inside a sturdy structure and away from windows. If you are outdoors, seek shelter immediately. Large hail and damaging winds can cause injury.',
    severity: 'Severe',
    certainty: 'Observed',
    urgency: 'Immediate',
    sent: '2026-10-18T22:10:00Z',
    effective: '2026-10-18T22:10:00Z',
    onset: '2026-10-18T22:10:00Z',
    expires: '2026-10-18T23:15:00Z',
    ends: '2026-10-18T23:15:00Z',
    updated: '2026-10-18T22:10:00Z',
    status: 'Actual',
    messageType: 'Alert',
    category: 'Met',
    response: 'Shelter',
    web: 'https://www.weather.gov/safety/thunderstorm',
  },
};

const severeThunderObservation: ObservationSummary = {
  stationId: 'KDEN',
  stationName: 'Denver International Airport',
  timestamp: new Date('2026-10-18T22:08:00Z'),
  temperatureC: 21,
  windKph: 56,
  windDirectionDeg: 90,
  humidityPct: 62,
  precipitationMm: 0,
  description: 'Lightning observed',
  sourceTimestampIso: '2026-10-18T22:08:00Z',
};

export const SIMULATION_SCENARIOS: SimulationScenario[] = [
  {
    id: 'tornado',
    title: 'Tornado Warning',
    description:
      'A confirmed tornado warning with a simple polygon. Demonstrates point-in-polygon INSIDE detection, the emergency action panel, and the official instruction display.',
    location: TORNADO_LOCATION,
    locationLabel: 'Norman, Oklahoma (demonstration point)',
    alert: tornadoAlert,
    observation: tornadoObservation,
    walkthrough: [
      'The selected demonstration point sits INSIDE the validated warning polygon.',
      'The status panel reports "INSIDE SUPPLIED BOUNDARY" with the reason shown.',
      'The Emergency Action Panel surfaces the official "TAKE COVER NOW" instruction.',
      'The timeline shows the alert as newly detected, with the source timestamp preserved.',
      'The hazard color (deep red) appears only on the indicator, polygon, and timeline — the rest of the app stays baby blue.',
    ],
  },
  {
    id: 'flash-flood',
    title: 'Flash Flood Warning (MultiPolygon)',
    description:
      'A flash flood warning with MultiPolygon geometry. Demonstrates multi-part boundary matching and the flood hazard category.',
    location: FLOOD_LOCATION,
    locationLabel: 'Austin, Texas (demonstration point)',
    alert: flashFloodAlert,
    observation: flashFloodObservation,
    walkthrough: [
      'The alert geometry is a MultiPolygon with two parts.',
      'The selected point lies inside the first part — the impact state is INSIDE SUPPLIED BOUNDARY.',
      'Official instructions emphasize "Turn Around, Don\'t Drown" and are surfaced verbatim.',
      'The nearby station observation shows heavy rain — but note that clear observations never invalidate a warning.',
    ],
  },
  {
    id: 'severe-thunder',
    title: 'Severe Thunderstorm Warning (Polygon with hole)',
    description:
      'A severe thunderstorm warning whose polygon contains a hole. Demonstrates correct hole handling and an OUTSIDE result when the point falls in the hole.',
    location: TSTORM_LOCATION,
    locationLabel: 'Denver, Colorado (demonstration point in the polygon hole)',
    observation: severeThunderObservation,
    alert: severeThunderAlert,
    walkthrough: [
      'Check the warning boundary for your selected location. In this example, the location falls inside a hole in the polygon, so it is outside the supplied warning area.',
      'Do not treat an OUTSIDE SUPPLIED BOUNDARY result as an all-clear. A boundary may not capture every local hazard, and conditions can change.',
      'Follow the alert’s safety guidance: remain inside a sturdy structure and stay away from windows. If you are outdoors, seek shelter.',
    ],
  },
];

export function getScenario(id: string): SimulationScenario | undefined {
  return SIMULATION_SCENARIOS.find((s) => s.id === id);
}

/** A scenario where the point lies clearly OUTSIDE the polygon (for testing/demo). */
export const TORNADO_OUTSIDE_POINT: GeoPoint = { lat: 35.5, lng: -97.8 };

/** A scenario with NO geometry — for testing the "LOCATION IMPACT UNKNOWN" state. */
export const NO_GEOMETRY_ALERT: NwsAlertFeature = {
  id: 'sim-no-geometry-0001',
  type: 'Feature',
  geometry: null,
  properties: {
    id: 'sim-no-geometry-0001',
    areaDesc: 'Demo County, USA',
    event: 'Winter Weather Advisory',
    headline: 'Winter Weather Advisory for Demo County',
    description: 'A winter weather advisory is in effect. Light snow may reduce visibility.',
    instruction: null, // missing instructions — exercises the fallback path
    severity: 'Minor',
    certainty: 'Likely',
    urgency: 'Expected',
    sent: '2026-10-18T12:00:00Z',
    effective: '2026-10-18T12:00:00Z',
    onset: '2026-10-18T12:00:00Z',
    expires: '2026-10-18T18:00:00Z',
    ends: '2026-10-18T18:00:00Z',
    updated: '2026-10-18T12:00:00Z',
    status: 'Actual',
    messageType: 'Alert',
    category: 'Met',
    response: 'Avoid',
    web: 'https://www.weather.gov/safety/winter',
  },
};
