import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  NormalizedAlert,
  ObservationSummary,
  GeoPoint,
  DataStatus,
} from '@/types/domain';
import {
  fetchActiveAlerts,
  fetchNearbyStations,
  fetchLatestObservation,
  NwsApiError,
} from '@/lib/nwsClient';
import { normalizeAlerts, cToUserTempC, mpsToKph, mmFromMeters } from '@/lib/normalize';
import { useTimeline } from '@/lib/useTimeline';
import type { NwsObservationResponse } from '@/types/nws';

const STALE_AFTER_MS = 10 * 60_000; // 10 min since last successful fetch

export interface UseLiveDataResult {
  alerts: NormalizedAlert[];
  observations: ObservationSummary[];
  dataStatus: DataStatus;
  lastRefreshedAt: Date | null;
  loading: boolean;
  refresh: () => void;
  /** Timeline entries recorded this session. */
  timelineEntries: ReturnType<typeof useTimeline>['entries'];
  resetTimeline: () => void;
  /** Only valid when not in simulation. */
  point: GeoPoint | null;
  setPoint: (p: GeoPoint | null) => void;
  /** Replace alerts/observations directly (used by simulation). */
  setExternalData: (data: {
    alerts: NormalizedAlert[];
    observations: ObservationSummary[];
  }) => void;
  /** Reset external data and return to live fetching. */
  clearExternalData: () => void;
  isExternal: boolean;
}

export function useLiveData(): UseLiveDataResult {
  const [point, setPoint] = useState<GeoPoint | null>({ lat: 39.4496, lng: -75.7163 });
  const [alerts, setAlerts] = useState<NormalizedAlert[]>([]);
  const [observations, setObservations] = useState<ObservationSummary[]>([]);
  const [dataStatus, setDataStatus] = useState<DataStatus>({
    lastSuccessfulFetch: null,
    lastFetchError: null,
    isStale: false,
    ok: false,
  });
  const [loading, setLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [isExternal, setIsExternal] = useState(false);

  const { entries: timelineEntries, observe, reset: resetTimeline } = useTimeline();
  const abortRef = useRef<AbortController | null>(null);

  const runFetch = useCallback(
    async (p: GeoPoint) => {
      setLoading(true);
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      let alertsResult: NormalizedAlert[] = [];
      let obsResult: ObservationSummary[] = [];
      let fetchError: string | null = null;
      let success = false;

      try {
        const active = await fetchActiveAlerts(p, { signal: ctrl.signal });
        alertsResult = normalizeAlerts(active.alerts);
        success = true;
        setLastRefreshedAt(active.fetchedAt);
        observe(alertsResult, active.fetchedAt);
      } catch (err) {
        if (ctrl.signal.aborted) return;
        if (err instanceof NwsApiError) {
          fetchError = err.isNetworkError
            ? 'Unable to reach the National Weather Service API. Check your connection.'
            : `NWS API error: ${err.message}`;
        } else {
          fetchError = 'Failed to fetch active alerts.';
        }
      }

      // Observations are best-effort and don't gate the alert UI.
      try {
        const stations = await fetchNearbyStations(p, 2);
        const obs: ObservationSummary[] = [];
        for (const st of stations) {
          if (ctrl.signal.aborted) break;
          try {
            const r: NwsObservationResponse = await fetchLatestObservation(st);
            obs.push(toObservation(r, st.name));
          } catch {
            // Skip a station that fails; keep going.
          }
        }
        obsResult = obs;
      } catch {
        // Observations are optional; leave empty.
      }

      if (ctrl.signal.aborted) return;

      setAlerts(alertsResult);
      setObservations(obsResult);
      setDataStatus((previousStatus) => ({
        lastSuccessfulFetch: success ? new Date() : previousStatus.lastSuccessfulFetch,
        lastFetchError: fetchError,
        isStale: success
          ? false
          : previousStatus.lastSuccessfulFetch !== null &&
            Date.now() - (previousStatus.lastSuccessfulFetch?.getTime() ?? 0) > STALE_AFTER_MS,
        ok: success,
      }));
      setLoading(false);
    },
    [observe],
  );

  const refresh = useCallback(() => {
    if (isExternal) return;
    if (point) void runFetch(point);
  }, [isExternal, point, runFetch]);

  // Fetch on point change.
  useEffect(() => {
    if (isExternal) return;
    if (point) void runFetch(point);
    else {
      setAlerts([]);
      setObservations([]);
      setDataStatus({ lastSuccessfulFetch: null, lastFetchError: null, isStale: false, ok: false });
    }
  }, [point, isExternal, runFetch]);

  const setExternalData = useCallback(
    (data: { alerts: NormalizedAlert[]; observations: ObservationSummary[] }) => {
      abortRef.current?.abort();
      setIsExternal(true);
      setAlerts(data.alerts);
      setObservations(data.observations);
      setDataStatus({
        lastSuccessfulFetch: new Date(),
        lastFetchError: null,
        isStale: false,
        ok: true,
      });
      setLastRefreshedAt(new Date());
      observe(data.alerts, new Date());
    },
    [observe],
  );

  const clearExternalData = useCallback(() => {
    setIsExternal(false);
    setAlerts([]);
    setObservations([]);
    resetTimeline();
    if (point) void runFetch(point);
  }, [point, resetTimeline, runFetch]);

  return {
    alerts,
    observations,
    dataStatus,
    lastRefreshedAt,
    loading,
    refresh,
    timelineEntries,
    resetTimeline,
    point,
    setPoint,
    setExternalData,
    clearExternalData,
    isExternal,
  };
}

function toObservation(
  r: NwsObservationResponse,
  stationName: string,
): ObservationSummary {
  const p = r.properties;
  return {
    stationId: p.station,
    stationName,
    timestamp: p.timestamp ? new Date(p.timestamp) : null,
    temperatureC: cToUserTempC(p.temperature?.value ?? null),
    windKph: mpsToKph(p.windSpeed?.value ?? null),
    windDirectionDeg: p.windDirection?.value ?? null,
    humidityPct: p.relativeHumidity?.value ?? null,
    precipitationMm: mmFromMeters(p.precipitationLastHour?.value ?? null),
    description: p.textDescription ?? null,
    sourceTimestampIso: p.timestamp ?? null,
  };
}
