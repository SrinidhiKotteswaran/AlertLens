import type { GeocodedPlace } from '@/types/domain';

/**
 * Geocoding via OpenStreetMap Nominatim (https://nominatim.org).
 *
 * Usage policy:
 *  - Max 1 request per second.
 *  - Must send a valid HTTP Referer or User-Agent.
 *  - Must provide attribution.
 *
 * In the browser, User-Agent is a forbidden header, so we set a Referer
 * (automatically sent by the browser) and a custom identifying header.
 * We also debounce client-side to respect the 1 req/s limit.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

let lastGeocodeAt = 0;
const MIN_GAP_MS = 1100;

export const GEOCODE_ATTRIBUTION =
  'Address search © OpenStreetMap contributors (ODbL) — nominatim.openstreetmap.org';

export class GeocodeError extends Error {
  constructor(message: string, public readonly isRateLimited: boolean = false) {
    super(message);
    this.name = 'GeocodeError';
  }
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  class: string;
  importance: number;
  address?: Record<string, string>;
  boundingbox?: [string, string, string, string];
}

export async function geocode(query: string, signal?: AbortSignal): Promise<GeocodedPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // Respect 1 req/s.
  const wait = Math.max(0, lastGeocodeAt + MIN_GAP_MS - Date.now());
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
  lastGeocodeAt = Date.now();

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    addressdetails: '1',
    limit: '6',
    countrycodes: 'us',
  });
  const url = `${NOMINATIM_BASE}?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-AlertLens-Contact': 'alertlens-project@example.com',
        'X-AlertLens-Purpose': 'civic-weather-intelligence',
      },
      signal,
      mode: 'cors',
    });
  } catch (err) {
    throw new GeocodeError(`Geocoding network error: ${(err as Error).message}`);
  }

  if (res.status === 429) {
    throw new GeocodeError('Address search service is rate-limiting requests. Try again shortly.', true);
  }
  if (!res.ok) {
    throw new GeocodeError(`Geocoding failed (${res.status}).`);
  }

  let body: NominatimResult[];
  try {
    body = (await res.json()) as NominatimResult[];
  } catch (err) {
    throw new GeocodeError(`Geocoding returned invalid JSON: ${(err as Error).message}`);
  }

  if (!Array.isArray(body)) return [];

  return body.map((r) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const label = r.display_name;
    return {
      id: `osm-${r.place_id}`,
      label,
      lat,
      lng,
      source: 'OpenStreetMap Nominatim',
      raw: r,
    } satisfies GeocodedPlace;
  });
}
