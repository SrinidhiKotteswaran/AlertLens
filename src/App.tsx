import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X, Info, MapPin, Users, ShieldCheck, Clock, ExternalLink, Waves, LocateFixed, Loader2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { LocationSearch } from '@/components/LocationSearch';
import { ImpactMap, mapLegendItems, COMMUNITY_HAZARDS } from '@/components/ImpactMap';
import type { CommunityReport } from '@/components/ImpactMap';
import { AlertDetails } from '@/components/AlertDetails';
import { EmergencyActionPanel } from '@/components/EmergencyActionPanel';
import { AlertList } from '@/components/AlertList';
import { SimulationLab } from '@/components/SimulationLab';
import { SettingsModal } from '@/components/SettingsModal';
import { PreparednessPanel } from '@/components/PreparednessPanel';
import { useLiveData } from '@/lib/useLiveData';
import type { GeocodedPlace, GeoPoint, NormalizedAlert, SimulationScenario } from '@/types/domain';
import { normalizeAlert, normalizeAlerts } from '@/lib/normalize';
import { GEOCODE_ATTRIBUTION } from '@/lib/geocodeClient';
import { fetchCommunityReports, insertCommunityReport } from '@/lib/communityReports';

const DEFAULT_POINT: GeoPoint = { lat: 39.4496, lng: -75.7163 };
const DEFAULT_LOCATION_LABEL = 'Middletown, Delaware';
const COMMUNITY_REPORTS_STORAGE_KEY = 'alertlens-community-reports-v1';
const COMMUNITY_REPORT_TTL_MS = 24 * 60 * 60 * 1000;

const US_STATE_CODES: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA',
  Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS',
  Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA',
  Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT',
  Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND',
  Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX',
  Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV',
  Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
};

function isDelawareLocation(label: string | null, point: GeoPoint | null): boolean {
  if (label && label.toLowerCase().includes('delaware')) return true;
  if (!point) return false;
  return point.lat >= 38.45 && point.lat <= 39.84 && point.lng >= -75.79 && point.lng <= -75.04;
}

function getUnexpiredReports(reports: CommunityReport[]): CommunityReport[] {
  const cutoff = Date.now() - COMMUNITY_REPORT_TTL_MS;
  return reports.filter((report) => {
    const createdAt = new Date(report.createdAt).getTime();
    return Number.isFinite(createdAt) && createdAt > cutoff;
  });
}

function loadCommunityReports(): CommunityReport[] {
  try {
    const saved = window.localStorage.getItem(COMMUNITY_REPORTS_STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const reports = getUnexpiredReports(parsed as CommunityReport[]);
    window.localStorage.setItem(COMMUNITY_REPORTS_STORAGE_KEY, JSON.stringify(reports));
    return reports;
  } catch {
    return [];
  }
}

function timeSinceReport(createdAt: string): string {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000));
  if (elapsedMinutes < 1) return 'Just now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const hours = Math.floor(elapsedMinutes / 60);
  const minutes = elapsedMinutes % 60;
  return minutes ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
}

export default function App() {
  const live = useLiveData();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [fitAlertId, setFitAlertId] = useState<string | null>(null);
  // Keep the header, map, and alert context aligned from the first render.
  const [locationLabel, setLocationLabel] = useState<string | null>(DEFAULT_LOCATION_LABEL);
  const [showLocationWelcome, setShowLocationWelcome] = useState(() => {
    try { return window.sessionStorage.getItem('alertlens-location-choice-v1') !== 'complete'; }
    catch { return true; }
  });
  const [welcomeLocating, setWelcomeLocating] = useState(false);
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [welcomeLocationError, setWelcomeLocationError] = useState<string | null>(null);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>(loadCommunityReports);
  const [reportSyncError, setReportSyncError] = useState<string | null>(null);
  const [reportRequestId, setReportRequestId] = useState(0);
  const [placeReportRequestId, setPlaceReportRequestId] = useState(0);
  const [simOpen, setSimOpen] = useState(false);
  const [simScenarioId, setSimScenarioId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshMs, setRefreshMs] = useState(120_000);
  const [regionalAlerts, setRegionalAlerts] = useState<NormalizedAlert[]>([]);
  const [regionalAlertsLoading, setRegionalAlertsLoading] = useState(true);
  const [regionalAlertsError, setRegionalAlertsError] = useState(false);
  const [regionalAlertsUpdatedAt, setRegionalAlertsUpdatedAt] = useState<Date | null>(null);
  const [alertSearch, setAlertSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const simulationMode = simScenarioId !== null;
  const showDelawareRegionalAlerts = !simulationMode && isDelawareLocation(locationLabel, live.point);

  // Keep a separate statewide feed so a coastal alert is visible even when the
  // default inland point is outside the alert polygon. Never present it as a
  // warning for the selected point unless the local NWS lookup confirms that.
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadRegionalAlerts = async () => {
      try {
        const response = await fetch('https://api.weather.gov/alerts/active?area=DE', {
          headers: { Accept: 'application/geo+json' },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`NWS regional alert request failed (${response.status}).`);
        const payload = await response.json() as { features?: unknown };
        const features = Array.isArray(payload.features) ? payload.features as Parameters<typeof normalizeAlerts>[0] : [];
        const now = Date.now();
        const normalized = normalizeAlerts(features).filter((alert) => {
          const start = alert.effective ?? alert.onset;
          const end = alert.ends ?? alert.expires;
          const hasStarted = !start || start.getTime() <= now;
          const hasNotEnded = !end || end.getTime() > now;
          return hasStarted && hasNotEnded && /coastal|storm surge|high surf|rip current|beach hazard/i.test(alert.event);
        });
        if (!cancelled) {
          setRegionalAlerts(normalized);
          setRegionalAlertsUpdatedAt(new Date());
          setRegionalAlertsError(false);
          setRegionalAlertsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRegionalAlertsError(true);
          setRegionalAlertsLoading(false);
        }
      }
    };

    void loadRegionalAlerts();
    const timer = window.setInterval(() => void loadRegionalAlerts(), 5 * 60_000);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (simulationMode || refreshMs === 0) return;
    const id = setInterval(() => live.refresh(), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, simulationMode, live.refresh]);

  const handleSelectPlace = useCallback((place: GeocodedPlace) => {
    if (simulationMode) return;
    const raw = place.raw as { address?: { state?: string } } | null;
    const stateName = raw?.address?.state;
    const stateAreaCode = stateName && US_STATE_CODES[stateName] &&
      (place.label === `${stateName}, United States` || place.label === stateName)
      ? US_STATE_CODES[stateName]
      : null;
    live.setStateAreaCode(stateAreaCode);
    live.setPointForLocation({ lat: place.lat, lng: place.lng });
    setLocationLabel(place.label);
    setShowLocationWelcome(false);
    try { window.sessionStorage.setItem('alertlens-location-choice-v1', 'complete'); } catch { /* Session storage is optional. */ }
    setSelectedAlertId(null);
    setFitAlertId(null);
  }, [live.setPointForLocation, live.setStateAreaCode, simulationMode]);

  const handleUseCoords = useCallback((p: GeoPoint, label: string) => {
    if (simulationMode) return;
    live.setStateAreaCode(null);
    live.setPointForLocation(p);
    setLocationLabel(label === 'Your device location' ? `Device location (${p.lat.toFixed(5)}, ${p.lng.toFixed(5)})` : label);
    setShowLocationWelcome(false);
    try { window.sessionStorage.setItem('alertlens-location-choice-v1', 'complete'); } catch { /* Session storage is optional. */ }
    setSelectedAlertId(null);
    setFitAlertId(null);
  }, [live.setPointForLocation, live.setStateAreaCode, simulationMode]);

  const handleWelcomeUseLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setWelcomeLocationError('This browser does not support device location. Search for a city or ZIP code below instead.');
      return;
    }
    setWelcomeLocating(true);
    setWelcomeLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handleUseCoords(
          { lat: position.coords.latitude, lng: position.coords.longitude },
          'Your device location',
        );
        setWelcomeLocating(false);
      },
      (geoError) => {
        setWelcomeLocating(false);
        setWelcomeLocationError(geoError.code === geoError.PERMISSION_DENIED
          ? 'Location permission was not granted. You can allow it in your browser settings or search for a city or ZIP code below.'
          : 'We couldn’t get your location. Check your browser settings or search for a city or ZIP code below.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, [handleUseCoords]);

  const handleRefresh = useCallback(() => {
    if (!simulationMode) live.refresh();
  }, [live.refresh, simulationMode]);

  const handleSelectAlert = useCallback((id: string | null) => {
    setSelectedAlertId(id);
    setFitAlertId(id);
  }, []);

  const handleSelectScenario = useCallback((scenario: SimulationScenario, point: GeoPoint) => {
    const normalized = normalizeAlert(scenario.alert);
    live.setExternalData({ alerts: [normalized], observations: scenario.observation ? [scenario.observation] : [] });
    live.setPoint(point);
    setSimScenarioId(scenario.id);
    setSimOpen(false);
    setSelectedAlertId(normalized.id);
    setFitAlertId(normalized.id);
    setLocationLabel(scenario.locationLabel);
  }, [live.setExternalData, live.setPoint]);

  const handleExitSimulation = useCallback(() => {
    setSimScenarioId(null);
    setSimOpen(false);
    setSelectedAlertId(null);
    setFitAlertId(null);
    live.clearExternalData();
    live.setStateAreaCode(null);
    setLocationLabel(null);
    live.setPointForLocation(DEFAULT_POINT);
    setLocationLabel(DEFAULT_LOCATION_LABEL);
  }, [live.clearExternalData, live.setPointForLocation, live.setStateAreaCode]);

  const selectedAlert: NormalizedAlert | null = useMemo(
    () => live.alerts.find((alert) => alert.id === selectedAlertId) ?? null,
    [live.alerts, selectedAlertId],
  );
  const legendItems = useMemo(() => mapLegendItems(live.alerts), [live.alerts]);
  const activeAlerts = useMemo(() => live.alerts.filter((alert) => {
    const end = alert.ends ?? alert.expires;
    return !end || end.getTime() > Date.now();
  }), [live.alerts]);
  const filteredAlerts = useMemo(() => {
    const query = alertSearch.trim().toLowerCase();
    return live.alerts.filter((alert) => {
      const matchesSeverity = severityFilter === 'all' || alert.severity.toLowerCase() === severityFilter;
      const searchable = [alert.event, alert.headline, alert.areaDesc, alert.description]
        .filter(Boolean).join(' ').toLowerCase();
      return matchesSeverity && (!query || searchable.includes(query));
    });
  }, [live.alerts, alertSearch, severityFilter]);

  useEffect(() => {
    let cancelled = false;

    const syncReports = async () => {
      try {
        const localReports = loadCommunityReports();
        const remoteReports = await fetchCommunityReports();
        const remoteIds = new Set(remoteReports.map((report) => report.id));

        // Migrate this browser's still-live reports to shared storage so an existing
        // report can also appear on other devices after the feature is deployed.
        for (const report of localReports) {
          if (remoteIds.has(report.id)) continue;
          try {
            const saved = await insertCommunityReport(report);
            remoteIds.add(saved.id);
          } catch {
            // Keep syncing other reports; a duplicate or invalid old report should not block the feed.
          }
        }

        const latestReports = await fetchCommunityReports();
        if (!cancelled) {
          setCommunityReports(latestReports);
          setReportSyncError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setReportSyncError(error instanceof Error ? error.message : 'Unable to sync shared community reports.');
        }
      }
    };

    void syncReports();
    const timer = window.setInterval(() => { void syncReports(); }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(COMMUNITY_REPORTS_STORAGE_KEY, JSON.stringify(getUnexpiredReports(communityReports)));
    } catch {
      // Reports still work for this session if browser storage is unavailable.
    }
  }, [communityReports]);

  useEffect(() => {
    const expireReports = () => setCommunityReports((current) => getUnexpiredReports(current));
    const timer = window.setInterval(expireReports, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const addCommunityReport = useCallback(async (report: CommunityReport) => {
    try {
      const saved = await insertCommunityReport(report);
      setCommunityReports((current) => getUnexpiredReports([saved, ...current.filter((item) => item.id !== saved.id)]));
      setReportSyncError(null);
    } catch (error) {
      // Keep community reporting usable when shared storage is not configured
      // or temporarily unavailable. The existing storage effect persists this
      // report locally; the sync loop can migrate it later if the backend returns.
      setCommunityReports((current) => getUnexpiredReports([report, ...current.filter((item) => item.id !== report.id)]));
      setReportSyncError(
        error instanceof Error
          ? `Saved in this browser only; shared reports are unavailable: ${error.message}`
          : 'Saved in this browser only; shared reports are currently unavailable.',
      );
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {simulationMode && <SimulationBanner onExit={handleExitSimulation} />}
      <Header
        locationLabel={locationLabel}
        dataStatus={live.dataStatus}
        activeAlertCount={activeAlerts.length}
        simulationMode={simulationMode}
        lastRefreshedAt={live.lastRefreshedAt}
        onRefresh={handleRefresh}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleSimulation={() => setSimOpen(true)}
      />

      {showLocationWelcome && !simulationMode && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="location-welcome-title">
          <section className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/50 bg-white shadow-2xl">
            <div className="bg-gradient-to-br from-brand-800 to-brand-600 px-6 py-7 text-white sm:px-8">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-white/15"><MapPin size={25} aria-hidden="true" /></div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/75">Welcome to AlertLens</p>
              <h2 id="location-welcome-title" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Safety alerts for where you are.</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/85">Choose your location to see relevant official weather alerts and map information. Your browser will ask permission before sharing your device location.</p>
            </div>
            <div className="space-y-4 p-6 sm:p-8">
              <button type="button" onClick={handleWelcomeUseLocation} disabled={welcomeLocating} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-wait disabled:opacity-70">
                {welcomeLocating ? <Loader2 size={17} className="animate-spin" /> : <LocateFixed size={17} />}
                {welcomeLocating ? 'Finding your location…' : 'Use my location'}
              </button>
              <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-wider text-ink-muted"><span className="h-px flex-1 bg-line" />or search manually<span className="h-px flex-1 bg-line" /></div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink">City, address, or ZIP code</label>
                <LocationSearch onSelect={handleSelectPlace} onUseCoordinates={handleUseCoords} currentLabel={null} />
              </div>
              {welcomeLocationError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">{welcomeLocationError}</p>}
              <p className="text-center text-[11px] leading-relaxed text-ink-muted">Location access is optional. AlertLens uses it to center the local alert search; you can also search for another place at any time.</p>
            </div>
          </section>
        </div>
      )}

      {regionalAlerts.length > 0 && showDelawareRegionalAlerts && (
        <section className="border-b-2 border-amber-300 bg-amber-50" aria-label="Active Delaware coastal alerts">
          <div className="mx-auto max-w-[1800px] px-3 py-3 sm:px-5 sm:py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-600 text-white shadow-sm">
                <Waves size={22} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-amber-700 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">Active Delaware coastal alert</span>
                  <span className="text-xs font-medium text-amber-900">Official National Weather Service feed</span>
                </div>
                <h2 className="mt-1 text-lg font-extrabold leading-tight text-amber-950 sm:text-xl">
                  {regionalAlerts[0].event}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-amber-950">
                  <strong>Affected areas:</strong> {regionalAlerts[0].areaDesc || 'See official alert for affected areas.'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-900">
                  {regionalAlerts[0].headline || 'An active coastal hazard alert has been issued for part of Delaware.'}
                  {' '}This is a statewide coastal alert feed; it may not apply to your selected address. Check the affected areas before making decisions.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <a href={regionalAlerts[0].web ?? 'https://www.weather.gov/phi/'} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 rounded-md bg-amber-900 px-3 py-2 text-xs font-bold text-white hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900">
                    Read official alert <ExternalLink size={13} aria-hidden="true" />
                  </a>
                  <span className="text-xs font-semibold text-amber-900">
                    {regionalAlerts.length > 1 ? `+${regionalAlerts.length - 1} other active coastal alert${regionalAlerts.length === 2 ? '' : 's'}` : ''}
                    {regionalAlertsUpdatedAt ? ` · Feed checked ${regionalAlertsUpdatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
      {regionalAlerts.length === 0 && regionalAlertsLoading && showDelawareRegionalAlerts && (
        <div className="border-b border-line bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900" role="status">
          Checking the official NWS feed for active Delaware coastal alerts…
        </div>
      )}
      {regionalAlerts.length === 0 && regionalAlertsError && showDelawareRegionalAlerts && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900" role="status">
          Delaware coastal alerts could not be verified just now. Check the <a className="font-bold underline" href="https://www.weather.gov/phi/" target="_blank" rel="noreferrer noopener">official NWS Mount Holly forecast</a> for current coastal hazards.
        </div>
      )}

      <main className="mx-auto w-full max-w-[1800px] flex-1 px-3 py-2 sm:px-4 sm:py-3">
        <section className="mb-2 flex flex-col gap-2 rounded-xl border border-line bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-700"><ShieldCheck size={13} /> Local awareness, community powered</div>
            <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Know what’s happening around you.</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-soft">Official weather alerts and location context first. Community reports are unverified and never replace official warnings.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => setSimOpen(true)} className="btn btn-primary">Try Simulation Lab</button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs text-ink-soft"><Users size={14} /> Community reports are unverified</span>
          </div>
        </section>

        <section className="panel mb-3 overflow-visible">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><MapPin size={19} aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">Showing alerts for</p>
                <h2 className="mt-0.5 break-words text-base font-semibold text-ink">{locationLabel ?? DEFAULT_LOCATION_LABEL}</h2>
                <p className="mt-1 text-xs text-ink-muted">The map and local alert search are centered on this location.</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowLocationEditor((open) => !open)} aria-expanded={showLocationEditor} className="btn shrink-0">
              <MapPin size={14} /> {showLocationEditor ? 'Cancel change' : 'Change location'}
            </button>
          </div>
          {showLocationEditor && (
            <div className="border-t border-line-soft bg-slate-50/70 p-3">
              <p className="mb-2 text-xs text-ink-soft">Search for another address, city, or ZIP code, or use your device location.</p>
              <LocationSearch onSelect={(place) => { handleSelectPlace(place); setShowLocationEditor(false); }} onUseCoordinates={(point, label) => { handleUseCoords(point, label); setShowLocationEditor(false); }} currentLabel={null} />
            </div>
          )}
        </section>

        <section className="mb-3 space-y-3" aria-label="Local alerts and guidance">
          {(live.loading || live.dataStatus.lastFetchError || live.dataStatus.isStale || live.dataStatus.coverageWarning) && !simulationMode && (
            <div className={`rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${live.dataStatus.lastFetchError ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-line bg-white text-ink-soft'}`} role={live.dataStatus.lastFetchError ? 'alert' : 'status'}>
              <div className="flex items-start gap-2">
                {live.loading && <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin" aria-hidden="true" />}
                <div className="min-w-0 flex-1">
                  {live.loading && <p className="font-semibold">Checking official alerts for {locationLabel ?? DEFAULT_LOCATION_LABEL}…</p>}
                  {live.dataStatus.lastFetchError && <p className="font-semibold">Live alert data could not be fully verified.</p>}
                  {live.dataStatus.lastFetchError && <p className="mt-0.5">{live.dataStatus.lastFetchError} <a className="font-semibold underline" href="https://www.weather.gov/" target="_blank" rel="noreferrer noopener">Check the official NWS site</a>.</p>}
                  {live.dataStatus.isStale && <p className="mt-0.5">Showing last-known alert data. It may no longer be current.</p>}
                  {live.dataStatus.coverageWarning && <p className="mt-0.5">{live.dataStatus.coverageWarning}</p>}
                  {live.lastRefreshedAt && <p className="mt-1 text-[11px]">Last successful alert check: {live.lastRefreshedAt.toLocaleString()}</p>}
                </div>
                {!live.loading && <button type="button" onClick={handleRefresh} className="shrink-0 rounded-md border border-current/20 px-2.5 py-1.5 font-semibold hover:bg-black/5">Retry</button>}
              </div>
            </div>
          )}
          <section className="panel" aria-label="Filter active alerts">
            <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_190px]">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-ink-soft">Search alerts</span>
                <input value={alertSearch} onChange={(event) => setAlertSearch(event.target.value)} placeholder="Search hazard, headline, affected area…" className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-ink-soft">Severity</span>
                <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100">
                  <option value="all">All severity levels</option>
                  <option value="extreme">Extreme</option>
                  <option value="severe">Severe</option>
                  <option value="moderate">Moderate</option>
                  <option value="minor">Minor</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>
            </div>
            <div className="border-t border-line-soft px-3 py-2 text-[11px] text-ink-muted">
              Showing {filteredAlerts.length} of {live.alerts.length} returned alert{live.alerts.length === 1 ? '' : 's'} · Filters affect this list only, not the map or preparedness guidance.
            </div>
          </section>
          {filteredAlerts.length === 0 && live.alerts.length > 0 ? (
            <div className="panel p-5 text-sm text-ink-muted">No alerts match these filters. Try a different search or choose “All severity levels”.</div>
          ) : (
            <AlertList alerts={filteredAlerts} selectedId={selectedAlertId} onSelect={handleSelectAlert} simulationMode={simulationMode} />
          )}
          {selectedAlert && (
            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
              <section className="panel overflow-hidden">
                <div className="px-4 py-3">
                  <h2 className="text-sm font-semibold text-ink">Recommended next steps</h2>
                  <p className="mt-1 text-xs text-ink-muted">Guidance for the selected official alert</p>
                </div>
                <div className="border-t border-line-soft"><EmergencyActionPanel alert={selectedAlert} simulationMode={simulationMode} /></div>
              </section>
              <details className="panel overflow-hidden">
                <summary className="cursor-pointer list-none px-4 py-3 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-500">
                  <span className="block text-sm font-semibold text-ink">Full alert details</span>
                  <span className="mt-1 block text-xs text-ink-muted">Official instructions, affected area, and boundary limitations</span>
                </summary>
                <div className="border-t border-line-soft"><AlertDetails alert={selectedAlert} point={live.point} simulationMode={simulationMode} sourceNote={simulationMode ? 'Synthetic demonstration data, not a live alert.' : 'Source: api.weather.gov active alerts.'} /></div>
              </details>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
          <section className="panel min-w-0 overflow-hidden">
            <div className="panel-header flex-wrap">
              <div><h2 className="text-base font-semibold text-ink">Weather &amp; Impact Map</h2><p className="mt-0.5 text-xs text-ink-muted">Explore official alert boundaries and your selected location. Community reports are unverified.</p></div>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600"><span className="h-2 w-2 rounded-full bg-blue-600" /> OpenStreetMap</span>
            </div>
            <div className="relative h-[48vh] min-h-[360px] sm:h-[58vh] sm:min-h-[460px]">
              <ImpactMap point={live.point} alerts={live.alerts} selectedAlertId={selectedAlertId} onSelectAlert={handleSelectAlert} fitAlertId={fitAlertId} reports={communityReports} onAddReport={addCommunityReport} reportRequestId={reportRequestId} placeReportRequestId={placeReportRequestId} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line-soft px-4 py-3">
              <div className="flex items-center gap-1.5 text-[10px] text-ink-soft"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Your selected location</div>
              {legendItems.filter((item) => item.label !== 'Selected location').slice(0, 3).map((item) => <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-ink-soft"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />NWS: {item.label}</div>)}
            </div>
          </section>

          <aside className="flex min-w-0 flex-col">
            <section className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="panel-header"><Users size={16} className="text-brand-600" /><div><h2 className="text-sm font-semibold text-ink">Community Hub</h2><p className="text-[11px] text-ink-muted">Recent reports · unverified</p></div><span className="ml-auto rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{communityReports.length}</span></div>
              <div className="grid grid-cols-1 gap-2 border-b border-line-soft p-3 sm:grid-cols-2 lg:grid-cols-1">
                <button type="button" disabled={!live.point || simulationMode} onClick={() => setReportRequestId((id) => id + 1)} className="w-full rounded-md bg-brand-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">Report at selected location</button>
                <button type="button" disabled={simulationMode} onClick={() => setPlaceReportRequestId((id) => id + 1)} className="w-full rounded-md border border-brand-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50">📍 Place report pin on map</button>
              </div>
              {communityReports.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center p-5 text-center"><div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500"><MapPin size={18} /></div><p className="text-sm font-medium text-ink">No community reports yet</p><p className="mt-1 text-xs leading-relaxed text-ink-muted">Add a local observation to create the first community pin. Reports expire after 24 hours.</p></div>
              ) : (
                <ul className="min-h-0 flex-1 divide-y divide-line-soft overflow-y-auto">
                  {communityReports.map((report) => {
                    const hazard = COMMUNITY_HAZARDS.find((item) => item.value === report.category) ?? COMMUNITY_HAZARDS[COMMUNITY_HAZARDS.length - 1];
                    return <li key={report.id} className="p-3"><div className="flex items-start gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base" style={{ backgroundColor: hazard.color + '20' }}>{hazard.icon}</span><div className="min-w-0 flex-1"><div className="text-xs font-semibold text-ink">{report.customHazard || report.category}</div><p className="mt-1 break-words text-xs leading-relaxed text-ink-soft">{report.details}</p><div className="mt-2 flex items-center gap-1 text-[10px] text-ink-muted"><Clock size={10} /> <time dateTime={report.createdAt} title={new Date(report.createdAt).toLocaleString()}>{timeSinceReport(report.createdAt)}</time> · Unverified</div></div></div></li>;
                  })}
                </ul>
              )}
              <div className="mt-auto border-t border-line-soft px-3 py-2 text-[10px] leading-relaxed text-ink-muted">{reportSyncError ? 'Browser-local fallback may be active · Auto-removed after 24 hours · Unverified reports.' : 'Shared across devices · Auto-removed after 24 hours · Unverified reports.'} Confirm hazards with official sources; do not treat a community post as a verified warning.</div>
              {reportSyncError && <div role="status" className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">Shared reports are temporarily unavailable: {reportSyncError}</div>}
            </section>
          </aside>
        </div>

        <section className="mt-3" aria-label="Preparedness planner" id="preparedness-planner">
          <PreparednessPanel alerts={activeAlerts} dataOk={live.dataStatus.ok} isStale={live.dataStatus.isStale} coverageWarning={live.dataStatus.coverageWarning ?? null} simulationMode={simulationMode} />
        </section>

        <footer className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-line-soft py-4 text-center text-[10px] text-ink-muted">
          <Info size={11} /> Official weather alerts: U.S. National Weather Service · Map © OpenStreetMap contributors · {GEOCODE_ATTRIBUTION}. Community reports are unverified; follow local emergency instructions.
        </footer>
      </main>

      <SimulationLab open={simOpen} onClose={() => setSimOpen(false)} activeScenarioId={simScenarioId} onSelectScenario={handleSelectScenario} onExitSimulation={handleExitSimulation} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} refreshIntervalMs={refreshMs} onChangeRefreshInterval={setRefreshMs} attribution={['Alert data: U.S. National Weather Service (api.weather.gov)', GEOCODE_ATTRIBUTION, 'Map tiles: © OpenStreetMap contributors']} />
    </div>
  );
}

function SimulationBanner({ onExit }: { onExit: () => void }) {
  return <div className="bg-red-700 text-white"><div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-2"><AlertTriangle size={15} /><span className="text-xs font-bold uppercase tracking-wide">Simulation — not live weather</span><span className="hidden text-xs text-red-100 sm:inline">Synthetic demonstration data only.</span><button type="button" onClick={onExit} className="ml-auto inline-flex items-center gap-1 rounded bg-white/15 px-2.5 py-1 text-xs font-medium hover:bg-white/25"><X size={12} /> Exit simulation</button></div></div>;
}
