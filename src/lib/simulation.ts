import type { NwsAlertFeature } from '@/types/nws';
import type { SimulationScenario, ObservationSummary, GeoPoint } from '@/types/domain';

// Keep synthetic alerts active for a full day whenever the app loads so demos
// remain usable after the original fixture dates have passed.
const SIMULATION_REFERENCE_TIME = Date.now();
function simulationIso(minutesFromNow = 0): string {
  return new Date(SIMULATION_REFERENCE_TIME + minutesFromNow * 60_000).toISOString();
}

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
    headline: 'Synthetic tornado warning for central Oklahoma',
    description:
      'In this synthetic scenario, a confirmed tornado is reported near central Oklahoma, moving northeast at 35 mph. This is a dangerous storm. TAKE COVER NOW.',
    instruction:
      'TAKE COVER NOW! Move to a basement or an interior room on the lowest floor of a sturdy building. Avoid windows. If you are outdoors, in a mobile home, or in a vehicle, move to the closest substantial shelter and protect yourself from flying debris.',
    severity: 'Severe',
    certainty: 'Observed',
    urgency: 'Immediate',
    sent: simulationIso(-3),
    effective: simulationIso(-3),
    onset: simulationIso(-3),
    expires: simulationIso(24 * 60),
    ends: simulationIso(24 * 60),
    updated: simulationIso(-1),
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
  timestamp: new Date(simulationIso(-5)),
  temperatureC: 24,
  windKph: 41,
  windDirectionDeg: 220,
  humidityPct: 71,
  precipitationMm: 0,
  description: 'Thunderstorm in vicinity',
  sourceTimestampIso: simulationIso(-5),
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
    headline: 'Synthetic flash flood warning for Travis County',
    description:
      'Heavy rainfall has produced 3 to 5 inches of rain since 7 PM. Flash flooding is occurring or imminent. Rapid rises on creeks and low-water crossings are expected. Do not drive through flooded roads.',
    instruction:
      'Turn Around, Don\'t Drown. Never drive through flooded roadways. Move to higher ground immediately if you are in a flood-prone area. Avoid creeks, draws, and low-water crossings.',
    severity: 'Severe',
    certainty: 'Likely',
    urgency: 'Expected',
    sent: simulationIso(-3),
    effective: simulationIso(-3),
    onset: simulationIso(-3),
    expires: simulationIso(24 * 60),
    ends: simulationIso(24 * 60),
    updated: simulationIso(-1),
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
  timestamp: new Date(simulationIso(-5)),
  temperatureC: 19,
  windKph: 18,
  windDirectionDeg: 150,
  humidityPct: 94,
  precipitationMm: 12.7,
  description: 'Heavy rain',
  sourceTimestampIso: simulationIso(-5),
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
    headline: 'Synthetic severe thunderstorm warning for Denver',
    description:
      'In this synthetic scenario, a severe thunderstorm is located over the Denver metro, moving east at 20 mph. Wind gusts up to 70 mph and large hail are possible.',
    instruction:
      'Remain inside a sturdy structure and away from windows. If you are outdoors, seek shelter immediately. Large hail and damaging winds can cause injury.',
    severity: 'Severe',
    certainty: 'Observed',
    urgency: 'Immediate',
    sent: simulationIso(-3),
    effective: simulationIso(-3),
    onset: simulationIso(-3),
    expires: simulationIso(24 * 60),
    ends: simulationIso(24 * 60),
    updated: simulationIso(-1),
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
  timestamp: new Date(simulationIso(-5)),
  temperatureC: 21,
  windKph: 56,
  windDirectionDeg: 90,
  humidityPct: 62,
  precipitationMm: 0,
  description: 'Lightning observed',
  sourceTimestampIso: simulationIso(-5),
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
      'Select Run scenario to load the sample Tornado Warning and its demonstration location.',
      'Find the location marker on the map and check that it falls inside the warning polygon.',
      'Read the location impact result and its explanation to see why this location is marked INSIDE SUPPLIED BOUNDARY.',
      'Review the alert details and Emergency Action Panel, then check the timeline for the sample alert and its timestamp.',
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
      'Select Run scenario to load the sample Flash Flood Warning.',
      'Look at the map and find the two separate sections that make up the warning boundary.',
      'Check the selected location’s impact result and read the explanation to see how the app handles a boundary with multiple sections.',
      'Read the alert instructions and compare them with the nearby observation. Remember: an observation that looks calm does not cancel a warning.',
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
      'Select Run scenario to load the sample Severe Thunderstorm Warning.',
      'Find the demonstration location on the map. It sits in the hole inside the polygon’s outer boundary.',
      'Check the impact result: the location is OUTSIDE SUPPLIED BOUNDARY because the hole is not part of the warned area.',
      'Read the safety guidance in the alert. An OUTSIDE result is not an all-clear, so use the alert details and official local guidance to understand the risk.',
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
    sent: simulationIso(-3),
    effective: simulationIso(-3),
    onset: simulationIso(-3),
    expires: simulationIso(24 * 60),
    ends: simulationIso(24 * 60),
    updated: simulationIso(-1),
    status: 'Actual',
    messageType: 'Alert',
    category: 'Met',
    response: 'Avoid',
    web: 'https://www.weather.gov/safety/winter',
  },
};
