import type { GeocodedPlace } from '@/types/domain';

/**
 * Geocoding via OpenStreetMap Nominatim (https://nominatim.org).
 *
 * Usage policy:
 *  - Max 1 request per second.
 *  - Must send a valid HTTP Referer or User-Agent.
 *  - Must provide attribution.
 *
 * Browsers control the User-Agent header. The browser's cross-origin Referer
 * identifies the requesting site; custom headers are intentionally avoided so
 * address search does not trigger an unnecessary CORS preflight.
 * Requests are serialized in this tab to avoid bursts against the public service.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

let nextGeocodeAt = 0;
let geocodeQueue: Promise<void> = Promise.resolve();
const MIN_GAP_MS = 1100;

async function waitForRateLimit(signal?: AbortSignal): Promise<void> {
  let release!: () => void;
  const previous = geocodeQueue;
  geocodeQueue = new Promise<void>((resolve) => { release = resolve; });
  await previous;

  try {
    if (signal?.aborted) throw new DOMException('Address search was cancelled.', 'AbortError');
    const wait = Math.max(0, nextGeocodeAt - Date.now());
    if (wait > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => {
          signal?.removeEventListener('abort', onAbort);
          resolve();
        }, wait);
        const onAbort = () => {
          window.clearTimeout(timer);
          reject(new DOMException('Address search was cancelled.', 'AbortError'));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
      });
    }
    if (signal?.aborted) throw new DOMException('Address search was cancelled.', 'AbortError');
    nextGeocodeAt = Date.now() + MIN_GAP_MS;
  } finally {
    release();
  }
}

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
  const trimmed = query.trim().slice(0, 200);
  if (trimmed.length < 2) return [];

  // Respect the public service's usage policy, including overlapping searches.
  await waitForRateLimit(signal);

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
      signal,
      mode: 'cors',
      referrerPolicy: 'strict-origin-when-cross-origin',
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

  return body.flatMap((r) => {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return [];
    }
    return [{
      id: `osm-${r.place_id}`,
      label: r.display_name,
      lat,
      lng,
      source: 'OpenStreetMap Nominatim',
      raw: r,
    } satisfies GeocodedPlace];
  });
}
