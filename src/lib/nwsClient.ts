import type {
  NwsAlertCollection,
  NwsAlertFeature,
  NwsPointsResponse,
  NwsObservationResponse,
} from '@/types/nws';

/**
 * NWS API client for api.weather.gov.
 *
 * Browser requests use only standard headers to avoid unnecessary CORS
 * preflight requests. Browsers control the User-Agent header, so this client
 * does not attempt to override it with custom identifying headers.
 * Responses are cached in memory to reduce repeat requests.
 */

const NWS_BASE = 'https://api.weather.gov';
const ACCEPT_GEOJSON = 'application/geo+json';
const ACCEPT_JSON = 'application/ld+json';

/** A tiny in-memory cache keyed by URL, honoring a TTL in ms. */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  etag: string | null;
}
const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 60_000; // 1 minute — well within NWS rate guidance for active alerts.

function isExpired(entry: CacheEntry<unknown>, now: number): boolean {
  return entry.expiresAt <= now;
}

function setCache<T>(url: string, value: T, ttlMs = DEFAULT_TTL_MS, etag: string | null = null): void {
  cache.set(url, { value, expiresAt: Date.now() + ttlMs, etag });
}

function getCache<T>(url: string): CacheEntry<T> | null {
  const entry = cache.get(url) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (isExpired(entry, Date.now())) {
    cache.delete(url);
    return null;
  }
  return entry;
}

export interface FetchResult<T> {
  data: T;
  fromCache: boolean;
  stale: boolean;
  fetchedAt: Date;
  /** HTTP status of the live request (200 when served from cache). */
  status: number;
}

export class NwsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    public readonly isNetworkError: boolean,
  ) {
    super(message);
    this.name = 'NwsApiError';
  }
}

async function nwsFetch<T>(
  url: string,
  options: {
    accept?: string;
    ttlMs?: number;
    /** Bypass cache and force a live request. */
    force?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<FetchResult<T>> {
  const accept = options.accept ?? ACCEPT_GEOJSON;
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

  if (!options.force) {
    const cached = getCache<T>(url);
    if (cached) {
      return {
        data: cached.value,
        fromCache: true,
        stale: false,
        fetchedAt: new Date(),
        status: 200,
      };
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: accept,
      },
      signal: options.signal,
      mode: 'cors',
    });
  } catch (err) {
    throw new NwsApiError(
      `Network error contacting ${url}: ${(err as Error).message}`,
      0,
      url,
      true,
    );
  }

  if (!response.ok) {
    // On 5xx, serve stale cache if available rather than failing hard.
    if (response.status >= 500) {
      const stale = cache.get(url) as CacheEntry<T> | undefined;
      if (stale) {
        return {
          data: stale.value,
          fromCache: true,
          stale: true,
          fetchedAt: new Date(),
          status: response.status,
        };
      }
    }
    let detail = '';
    try {
      const body = (await response.clone().json()) as { title?: string; detail?: string };
      detail = body.detail ?? body.title ?? '';
    } catch {
      /* ignore */
    }
    throw new NwsApiError(
      `NWS API ${response.status} ${response.statusText}${detail ? `: ${detail}` : ''}`,
      response.status,
      url,
      false,
    );
  }

  let data: T;
  try {
    data = (await response.json()) as T;
  } catch (err) {
    throw new NwsApiError(
      `Invalid JSON from ${url}: ${(err as Error).message}`,
      response.status,
      url,
      false,
    );
  }

  // Honor Cache-Control max-age if present; otherwise use the provided TTL.
  const cacheControl = response.headers.get('cache-control') ?? '';
  const maxAgeMatch = /max-age=(\d+)/i.exec(cacheControl);
  const effectiveTtl = maxAgeMatch ? Math.min(parseInt(maxAgeMatch[1], 10) * 1000, ttlMs * 5) : ttlMs;

  setCache(url, data, effectiveTtl, response.headers.get('etag'));
  return {
    data,
    fromCache: false,
    stale: false,
    fetchedAt: new Date(),
    status: response.status,
  };
}

export interface ActiveAlertsResult {
  alerts: NwsAlertFeature[];
  fetchedAt: Date;
  fromCache: boolean;
  stale: boolean;
}

/** Fetch official active alerts for a point, then broaden to its NWS zones if needed. */
export async function fetchActiveAlerts(
  point: { lat: number; lng: number },
  opts: { force?: boolean; signal?: AbortSignal } = {},
): Promise<ActiveAlertsResult> {
  // NWS point parameters are latitude,longitude. Keep enough precision for a real
  // selected location instead of rounding to a coarse nearby point.
  const pointUrl = `${NWS_BASE}/alerts/active?point=${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  const pointResult = await nwsFetch<NwsAlertCollection>(pointUrl, {
    accept: ACCEPT_GEOJSON,
    ttlMs: 60_000,
    force: opts.force,
    signal: opts.signal,
  });
  const pointFeatures = Array.isArray(pointResult.data?.features) ? pointResult.data.features : [];

  // Point-based alerts are the most specific result. If none are returned,
  // query the county, forecast, and fire-weather zones explicitly. A warning
  // can be issued for a zone even when the point endpoint's spatial match is
  // empty, and checking only the county is not sufficient for all products.
  if (pointFeatures.length === 0 && !opts.signal?.aborted) {
    try {
      const pointData = await fetchPoint(point, { force: opts.force, signal: opts.signal });
      const properties = pointData.properties as typeof pointData.properties & {
        county?: string;
        forecastZone?: string;
        fireWeatherZone?: string;
      };
      const zoneUrls = [properties.county, properties.forecastZone, properties.fireWeatherZone].filter(
        (value): value is string => typeof value === 'string' && value.length > 0,
      );
      const zoneIds = [...new Set(zoneUrls.map((value) => {
        const match = value.match(/\/zones\/(?:county|forecast|fire)\/([A-Z]{2}[CZ]\d{3})/i);
        return match?.[1]?.toUpperCase() ?? null;
      }).filter((value): value is string => value !== null))];

      const zoneResults = await Promise.allSettled(zoneIds.map((zoneId) =>
        nwsFetch<NwsAlertCollection>(`${NWS_BASE}/alerts/active/zone/${zoneId}`, {
          accept: ACCEPT_GEOJSON,
          ttlMs: 60_000,
          force: opts.force,
          signal: opts.signal,
        }),
      ));
      const byId = new Map<string, NwsAlertFeature>();
      for (const zoneResult of zoneResults) {
        if (zoneResult.status !== 'fulfilled') continue;
        const features = Array.isArray(zoneResult.value.data?.features) ? zoneResult.value.data.features : [];
        for (const feature of features) {
          const id = feature.properties?.id ?? feature.id;
          if (id) byId.set(id, feature);
        }
      }
      if (byId.size > 0) {
        const firstSuccess = zoneResults.find((item) => item.status === 'fulfilled');
        const zoneFetch = firstSuccess?.status === 'fulfilled' ? firstSuccess.value : null;
        return {
          alerts: [...byId.values()],
          fetchedAt: zoneFetch?.fetchedAt ?? pointResult.fetchedAt,
          fromCache: pointResult.fromCache && (zoneFetch?.fromCache ?? true),
          stale: pointResult.stale || (zoneFetch?.stale ?? false),
        };
      }
    } catch {
      // Zone lookups are best-effort; preserve the successful direct point result.
    }
  }

  return {
    alerts: pointFeatures,
    fetchedAt: pointResult.fetchedAt,
    fromCache: pointResult.fromCache,
    stale: pointResult.stale,
  };
}

export async function fetchPoint(
  point: { lat: number; lng: number },
  opts: { force?: boolean; signal?: AbortSignal } = {},
): Promise<NwsPointsResponse> {
  const url = `${NWS_BASE}/points/${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  const result = await nwsFetch<NwsPointsResponse>(url, {
    accept: ACCEPT_JSON,
    ttlMs: 300_000,
    force: opts.force,
    signal: opts.signal,
  });
  return result.data;
}

export interface NearbyStation {
  stationId: string;
  name: string;
  url: string;
  distanceMeters: number | null;
}

/** Get the nearest observation stations for a point (via the points endpoint). */
export async function fetchNearbyStations(
  point: { lat: number; lng: number },
  limit = 3,
): Promise<NearbyStation[]> {
  const pt = await fetchPoint(point);
  const stationsUrl = pt.properties.observationStations;
  const stationsResult = await nwsFetch<{
    features: Array<{
      id: string;
      properties: {
        stationIdentifier: string;
        name: string;
        elevation?: { value: number; unitCode: string };
      };
    }>;
  }>(stationsUrl, { accept: ACCEPT_JSON, ttlMs: 300_000 });

  const features = Array.isArray(stationsResult.data?.features)
    ? stationsResult.data.features
    : [];
  return features.slice(0, limit).map((f) => ({
    stationId: f.properties.stationIdentifier,
    name: f.properties.name,
    url: `${NWS_BASE}/stations/${f.properties.stationIdentifier}/observations/latest`,
    distanceMeters: null,
  }));
}

/** Fetch the latest observation from a station URL. */
export async function fetchLatestObservation(
  station: NearbyStation,
): Promise<NwsObservationResponse> {
  const result = await nwsFetch<NwsObservationResponse>(station.url, {
    accept: ACCEPT_JSON,
    ttlMs: 120_000,
  });
  return result.data;
}

/** Clear the in-memory cache (used when toggling simulation mode). */
export function clearNwsCache(): void {
  cache.clear();
}
