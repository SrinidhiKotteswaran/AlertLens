/**
 * NWS API response models — typed to the actual api.weather.gov schema.
 * These model only the fields AlertLens consumes. Unknown extra fields are allowed.
 */

export type NwsSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
export type NwsUrgency = 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown';
export type NwsCertainty =
  | 'Observed'
  | 'Likely'
  | 'Possible'
  | 'Unlikely'
  | 'Unknown';

/** A single alert feature from /alerts/active. */
export interface NwsAlertFeature {
  id: string;
  type: 'Feature';
  geometry: NwsGeometry | null;
  properties: NwsAlertProperties;
}

export interface NwsAlertProperties {
  id: string;
  areaDesc: string;
  event: string;
  headline: string | null;
  description: string | null;
  instruction: string | null;
  severity: NwsSeverity;
  certainty: NwsCertainty;
  urgency: NwsUrgency;
  sent: string;
  effective: string | null;
  onset: string | null;
  expires: string | null;
  ends: string | null;
  updated: string | null;
  status: string;
  messageType: string;
  category: string;
  response: string | null;
  affectedZones?: string[];
  web?: string | null;
}

export type NwsGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

export interface NwsAlertCollection {
  features: NwsAlertFeature[];
  updatedAt?: string;
  title?: string;
}

/** /points response — used to discover forecast/observation endpoints. */
export interface NwsPointsProperties {
  gridId: string;
  gridX: number;
  gridY: number;
  relativeLocation: {
    geometry: { type: string; coordinates: number[] };
    properties: { city: string; state: string; distance: number; bearing: number };
  };
  forecast: string;
  forecastHourly: string;
  forecastGridData: string;
  observationStations: string;
  radar: string | null;
  county?: string;
  forecastZone?: string;
  fireWeatherZone?: string;
}

export interface NwsPointsResponse {
  id: string;
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: number[] };
  properties: NwsPointsProperties;
}

/** /stations/<id>/observations/latest */
export interface NwsObservationProperties {
  station: string;
  timestamp: string;
  textDescription?: string | null;
  temperature?: { value: number | null; unitCode: string } | null;
  windSpeed?: { value: number | null; unitCode: string } | null;
  windDirection?: { value: number | null; unitCode: string } | null;
  barometricPressure?: { value: number | null; unitCode: string } | null;
  relativeHumidity?: { value: number | null; unitCode: string } | null;
  dewpoint?: { value: number | null; unitCode: string } | null;
  precipitationLastHour?: { value: number | null; unitCode: string } | null;
}

export interface NwsObservationResponse {
  id: string;
  type: 'Feature';
  properties: NwsObservationProperties;
}

export interface NwsStation {
  stationId: string;
  name: string;
  distance?: { value: number; unitCode: string } | null;
}
