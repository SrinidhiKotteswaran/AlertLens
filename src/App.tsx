import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X, Info, MapPin, Users, ShieldCheck, Clock } from 'lucide-react';
import { Header } from '@/components/Header';
import { LocationSearch } from '@/components/LocationSearch';
import { ImpactMap, mapLegendItems, COMMUNITY_HAZARDS } from '@/components/ImpactMap';
import type { CommunityReport } from '@/components/ImpactMap';
import { AlertDetails } from '@/components/AlertDetails';
import { EmergencyActionPanel } from '@/components/EmergencyActionPanel';
import { AlertList } from '@/components/AlertList';
import { SimulationLab } from '@/components/SimulationLab';
import { SettingsModal } from '@/components/SettingsModal';
import { useLiveData } from '@/lib/useLiveData';
import type { GeocodedPlace, GeoPoint, NormalizedAlert, ObservationSummary, SimulationScenario } from '@/types/domain';
import { normalizeAlert } from '@/lib/normalize';
import { GEOCODE_ATTRIBUTION } from '@/lib/geocodeClient';
import { fetchCommunityReports, insertCommunityReport } from '@/lib/communityReports';

const DEFAULT_POINT: GeoPoint = { lat: 39.4496, lng: -75.7163 };
const DEFAULT_LOCATION_LABEL = 'Middletown, Delaware';
const COMMUNITY_REPORTS_STORAGE_KEY = 'alertlens-community-reports-v1';
const COMMUNITY_REPORT_TTL_MS = 24 * 60 * 60 * 1000;

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
  const [locationLabel, setLocationLabel] = useState<string | null>(DEFAULT_LOCATION_LABEL);
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>(loadCommunityReports);
  const [reportSyncError, setReportSyncError] = useState<string | null>(null);
  const [reportRequestId, setReportRequestId] = useState(0);
  const [placeReportRequestId, setPlaceReportRequestId] = useState(0);
  const [simOpen, setSimOpen] = useState(false);
  const [simScenarioId, setSimScenarioId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshMs, setRefreshMs] = useState(120_000);
  const simulationMode = simScenarioId !== null;

  useEffect(() => {
    if (simulationMode || refreshMs === 0) return;
    const id = setInterval(() => live.refresh(), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, simulationMode, live]);

  const handleSelectPlace = useCallback((place: GeocodedPlace) => {
    if (simulationMode) return;
    live.setPoint({ lat: place.lat, lng: place.lng });
    setLocationLabel(place.label);
    setSelectedAlertId(null);
    setFitAlertId(null);
  }, [live, simulationMode]);

  const handleUseCoords = useCallback((p: GeoPoint, label: string) => {
    if (simulationMode) return;
    live.setPoint(p);
    setLocationLabel(label);
    setSelectedAlertId(null);
    setFitAlertId(null);
  }, [live, simulationMode]);

  const handleRefresh = useCallback(() => {
    if (!simulationMode) live.refresh();
  }, [live, simulationMode]);

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
  }, [live]);

  const handleExitSimulation = useCallback(() => {
    setSimScenarioId(null);
    setSimOpen(false);
    setSelectedAlertId(null);
    setFitAlertId(null);
    live.clearExternalData();
    setLocationLabel(null);
    live.setPoint(DEFAULT_POINT);
    setLocationLabel(DEFAULT_LOCATION_LABEL);
  }, [live]);

  const selectedAlert: NormalizedAlert | null = useMemo(
    () => live.alerts.find((alert) => alert.id === selectedAlertId) ?? null,
    [live.alerts, selectedAlertId],
  );
  const legendItems = useMemo(() => mapLegendItems(live.alerts, {}), [live.alerts]);
  const activeAlerts = useMemo(() => live.alerts.filter((alert) => {
    const end = alert.ends ?? alert.expires;
    return !end || end.getTime() > Date.now();
  }), [live.alerts]);

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
    const saved = await insertCommunityReport(report);
    setCommunityReports((current) => getUnexpiredReports([saved, ...current.filter((item) => item.id !== saved.id)]));
    setReportSyncError(null);
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
        canDetermineImpact={false}
      />

      <main className="mx-auto w-full max-w-[1800px] flex-1 px-3 py-4 sm:px-5">
        <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-brand-700"><ShieldCheck size={14} /> Local awareness, community powered</div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Know what’s happening around you.</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">Explore official National Weather Service alerts and share on-the-ground conditions with your community.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => setSimOpen(true)} className="btn btn-primary">Try Simulation Lab</button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-xs text-ink-soft"><Users size={14} /> Community reports are unverified</span>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[300px_minmax(0,1fr)_330px]">
          <aside className="space-y-4">
            <section className="panel overflow-hidden">
              <div className="panel-header"><MapPin size={16} className="text-brand-600" /><h2 className="text-sm font-semibold text-ink">Your Area</h2></div>
              <div className="p-4">
                <label className="mb-2 block text-xs font-medium text-ink-soft">Enter your address or ZIP code</label>
                <LocationSearch onSelect={handleSelectPlace} onUseCoordinates={handleUseCoords} currentLabel={locationLabel} />
                
                <button type="button" disabled={!live.point || simulationMode} onClick={() => setReportRequestId((id) => id + 1)} className="mt-3 w-full rounded-md bg-brand-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50">Report at selected location</button>
                <button type="button" disabled={simulationMode} onClick={() => setPlaceReportRequestId((id) => id + 1)} className="mt-2 w-full rounded-md border border-brand-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-800 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50">📍 Place report pin on map</button>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">Choose a location above or place a pin on the map. Reports are shared across devices, unverified, and automatically removed after 24 hours.</p>
              </div>
            </section>

            <section className="panel overflow-hidden">
              <div className="panel-header"><Users size={16} className="text-brand-600" /><div><h2 className="text-sm font-semibold text-ink">Community Hub</h2><p className="text-[11px] text-ink-muted">Reports from the last 24 hours</p></div><span className="ml-auto rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{communityReports.length}</span></div>
              {communityReports.length === 0 ? (
                <div className="p-5 text-center"><div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500"><MapPin size={18} /></div><p className="text-sm font-medium text-ink">No community reports yet</p><p className="mt-1 text-xs leading-relaxed text-ink-muted">Post a local observation to add the first community pin. Reports expire after 24 hours.</p></div>
              ) : (
                <ul className="max-h-[330px] divide-y divide-line-soft overflow-y-auto">
                  {communityReports.map((report) => {
                    const hazard = COMMUNITY_HAZARDS.find((item) => item.value === report.category) ?? COMMUNITY_HAZARDS[COMMUNITY_HAZARDS.length - 1];
                    return <li key={report.id} className="p-3"><div className="flex items-start gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base" style={{ backgroundColor: hazard.color + '20' }}>{hazard.icon}</span><div className="min-w-0 flex-1"><div className="text-xs font-semibold text-ink">{report.customHazard || report.category}</div><p className="mt-1 break-words text-xs leading-relaxed text-ink-soft">{report.details}</p><div className="mt-2 flex items-center gap-1 text-[10px] text-ink-muted"><Clock size={10} /> {timeSinceReport(report.createdAt)} · Unverified</div></div></div></li>;
                  })}
                </ul>
              )}
              <div className="border-t border-line-soft px-3 py-2 text-[10px] text-ink-muted">Shared across devices · Auto-removed after 24 hours · Unverified reports</div>
              {reportSyncError && <div role="status" className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">Shared reports are temporarily unavailable: {reportSyncError}</div>}
            </section>

            {live.point && <AlertList alerts={live.alerts} selectedId={selectedAlertId} onSelect={handleSelectAlert} simulationMode={simulationMode} />}
          </aside>

          <section className="panel min-w-0 overflow-hidden">
            <div className="panel-header flex-wrap">
              <div><h2 className="text-base font-semibold text-ink">Community &amp; Weather Map</h2><p className="mt-0.5 text-xs text-ink-muted">Select an address, or choose “Place report pin on map” to mark an exact spot · Community reports are unverified</p></div>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-600"><span className="h-2 w-2 rounded-full bg-blue-600" /> OpenStreetMap</span>
            </div>
            <div className="relative h-[62vh] min-h-[460px]">
              <ImpactMap point={live.point} alerts={live.alerts} selectedAlertId={selectedAlertId} onSelectAlert={handleSelectAlert} fitAlertId={fitAlertId} reports={communityReports} onAddReport={addCommunityReport} reportRequestId={reportRequestId} placeReportRequestId={placeReportRequestId} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line-soft px-4 py-3">
              <div className="flex items-center gap-1.5 text-[10px] text-ink-soft"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Your selected location</div>
              {legendItems.filter((item) => item.label !== 'Selected location').slice(0, 3).map((item) => <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-ink-soft"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />NWS: {item.label}</div>)}
            </div>
          </section>

          <aside className="space-y-4">
            {!live.point && !simulationMode ? (
              <section className="panel p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-50 text-sky-700"><MapPin size={20} /></span><div><h2 className="font-semibold text-ink">⛅ Ready to check your area</h2><p className="mt-1 text-sm leading-relaxed text-ink-soft">Search for a city above or open the Simulation Lab to inspect active weather threats.</p></div></div></section>
            ) : (
              <>
                <SafetyStatusCard pointLabel={locationLabel} loading={live.loading} dataOk={live.dataStatus.ok} error={live.dataStatus.lastFetchError} alerts={activeAlerts} simulationMode={simulationMode} />
                {selectedAlert ? <><AlertDetails alert={selectedAlert} point={live.point} sourceNote={simulationMode ? 'Synthetic demonstration data, not a live alert.' : 'Source: api.weather.gov active alerts.'} /><EmergencyActionPanel alert={selectedAlert} simulationMode={simulationMode} /></> : activeAlerts.length > 0 ? <section className="panel p-4"><p className="text-sm text-ink-soft">Choose an alert from the left list or click an alert area on the map to see its explanation and recommended actions.</p></section> : <section className="panel p-4"><h2 className="text-sm font-semibold text-ink">What to do next</h2><ul className="mt-2 space-y-2 text-xs leading-relaxed text-ink-soft"><li>• Keep an eye on changing local conditions.</li><li>• Follow instructions from local emergency officials.</li><li>• Community pins are unverified observations, not official warnings.</li></ul></section>}
              </>
            )}
          </aside>
        </div>

        <footer className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-line-soft py-4 text-center text-[10px] text-ink-muted">
          <Info size={11} /> Official weather alerts: U.S. National Weather Service · Map © OpenStreetMap contributors · {GEOCODE_ATTRIBUTION}. Community reports are unverified; follow local emergency instructions.
        </footer>
      </main>

      <SimulationLab open={simOpen} onClose={() => setSimOpen(false)} activeScenarioId={simScenarioId} onSelectScenario={handleSelectScenario} onExitSimulation={handleExitSimulation} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} refreshIntervalMs={refreshMs} onChangeRefreshInterval={setRefreshMs} attribution={['Alert data: U.S. National Weather Service (api.weather.gov)', GEOCODE_ATTRIBUTION, 'Map tiles: © OpenStreetMap contributors']} />
    </div>
  );
}

function SafetyStatusCard({ pointLabel, loading, dataOk, error, alerts, simulationMode }: { pointLabel: string | null; loading: boolean; dataOk: boolean; error: string | null; alerts: NormalizedAlert[]; simulationMode: boolean }) {
  const activeWarning = alerts.some((alert) => alert.severity === 'Extreme' || alert.severity === 'Severe' || /warning/i.test(alert.event));
  const activeWatch = alerts.some((alert) => /watch|advisory/i.test(alert.event));
  const title = simulationMode ? 'SIMULATION ACTIVE' : loading && !dataOk ? 'Checking local alerts…' : error && !dataOk ? 'Official alerts temporarily unavailable' : activeWarning ? 'WARNING ACTIVE' : activeWatch ? 'WATCH / ADVISORY ACTIVE' : dataOk && alerts.length === 0 ? 'No active alerts returned' : alerts.length > 0 ? 'ACTIVE WEATHER ALERTS' : 'Checking local alerts…';
  const theme = simulationMode || activeWarning ? 'border-red-200 bg-red-50 text-red-800' : activeWatch || alerts.length > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : dataOk && alerts.length === 0 ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-700';
  return <section className="panel overflow-hidden"><div className="panel-header"><ShieldCheck size={16} className="text-brand-600" /><h2 className="text-sm font-semibold text-ink">Safety Status</h2></div><div className="p-4"><div className={`rounded-xl border p-4 ${theme}`} role="status"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full border-2 border-current text-lg">{simulationMode || activeWarning ? '!' : activeWatch || alerts.length > 0 ? '◉' : dataOk && alerts.length === 0 ? 'i' : '…'}</span><div><div className="text-sm font-bold tracking-wide">{title}</div><div className="mt-0.5 text-xs opacity-90">{pointLabel || 'Demonstration location'}</div></div></div></div><p className="mt-3 text-xs leading-relaxed text-ink-soft">{simulationMode ? 'This is synthetic demonstration data, not a real alert.' : error && !dataOk ? 'AlertLens could not confirm current conditions. Check the official source before making safety decisions.' : dataOk && alerts.length === 0 ? 'The NWS point, county, forecast, and fire-weather zone queries returned no active alerts at the last successful check. This is not a guarantee that conditions are safe.' : alerts.length > 0 ? `${alerts.length} active alert${alerts.length === 1 ? '' : 's'} returned for this location. Select one to read details.` : 'Waiting for the first successful check of official weather alerts.'}</p></div></section>;
}

function SimulationBanner({ onExit }: { onExit: () => void }) {
  return <div className="bg-red-700 text-white"><div className="mx-auto flex max-w-[1800px] items-center gap-3 px-4 py-2"><AlertTriangle size={15} /><span className="text-xs font-bold uppercase tracking-wide">Simulation — not live weather</span><span className="hidden text-xs text-red-100 sm:inline">Synthetic demonstration data only.</span><button type="button" onClick={onExit} className="ml-auto inline-flex items-center gap-1 rounded bg-white/15 px-2.5 py-1 text-xs font-medium hover:bg-white/25"><X size={12} /> Exit simulation</button></div></div>;
}
