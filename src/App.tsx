import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X, Info } from 'lucide-react';
import { Header } from '@/components/Header';
import { LocationSearch } from '@/components/LocationSearch';
import { ImpactMap, mapLegendItems } from '@/components/ImpactMap';
import { LocalStatusPanel } from '@/components/LocalStatusPanel';
import { AlertDetails } from '@/components/AlertDetails';
import { EmergencyActionPanel } from '@/components/EmergencyActionPanel';
import { TimelinePanel } from '@/components/TimelinePanel';
import { ObservationsPanel } from '@/components/ObservationsPanel';
import { AlertList } from '@/components/AlertList';
import { SimulationLab } from '@/components/SimulationLab';
import { SettingsModal } from '@/components/SettingsModal';
import { useLiveData } from '@/lib/useLiveData';
import { computeImpact } from '@/lib/geometry';
import type {
  GeocodedPlace,
  GeoPoint,
  NormalizedAlert,
  ObservationSummary,
  SimulationScenario,
} from '@/types/domain';
import { SIMULATION_SCENARIOS, getScenario } from '@/lib/simulation';
import { normalizeAlert } from '@/lib/normalize';
import { GEOCODE_ATTRIBUTION } from '@/lib/geocodeClient';

const DEFAULT_POINT: GeoPoint = { lat: 39.0997, lng: -94.5786 }; // Kansas City — central US

export default function App() {
  const live = useLiveData();

  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [fitAlertId, setFitAlertId] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  const [simOpen, setSimOpen] = useState(false);
  const [simScenarioId, setSimScenarioId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshMs, setRefreshMs] = useState(120_000);

  const simulationMode = simScenarioId !== null;
  const firstLoadRef = useRef(true);

  // On mount, set a sensible default location so the dashboard shows real data immediately.
  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      live.setPoint(DEFAULT_POINT);
      setLocationLabel('Kansas City, Missouri (default)');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh (live mode only, respects NWS guidance).
  useEffect(() => {
    if (simulationMode || refreshMs === 0) return;
    const id = setInterval(() => {
      live.refresh();
    }, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, simulationMode, live]);

  const handleSelectPlace = useCallback(
    (place: GeocodedPlace) => {
      if (simulationMode) return;
      live.setPoint({ lat: place.lat, lng: place.lng });
      setLocationLabel(place.label);
      setSelectedAlertId(null);
      setFitAlertId(null);
    },
    [live, simulationMode],
  );

  const handleUseCoords = useCallback(
    (p: GeoPoint, label: string) => {
      if (simulationMode) return;
      live.setPoint(p);
      setLocationLabel(label);
      setSelectedAlertId(null);
      setFitAlertId(null);
    },
    [live, simulationMode],
  );

  const handleRefresh = useCallback(() => {
    if (simulationMode) return;
    live.refresh();
  }, [live, simulationMode]);

  const handleSelectAlert = useCallback((id: string | null) => {
    setSelectedAlertId(id);
    setFitAlertId(id);
  }, []);

  const handleSelectScenario = useCallback(
    (scenario: SimulationScenario, point: GeoPoint) => {
      const normalized = normalizeAlert(scenario.alert);
      live.setExternalData({
        alerts: [normalized],
        observations: scenario.observation ? [scenario.observation] : [],
      });
      live.setPoint(point);
      setSimScenarioId(scenario.id);
      setSimOpen(false);
      setSelectedAlertId(normalized.id);
      setFitAlertId(normalized.id);
      setLocationLabel(scenario.locationLabel);
    },
    [live],
  );

  const handleExitSimulation = useCallback(() => {
    setSimScenarioId(null);
    setSimOpen(false);
    setSelectedAlertId(null);
    setFitAlertId(null);
    live.clearExternalData();
    setLocationLabel('Kansas City, Missouri (default)');
    live.setPoint(DEFAULT_POINT);
  }, [live]);

  const selectedAlert: NormalizedAlert | null = useMemo(
    () => live.alerts.find((a) => a.id === selectedAlertId) ?? null,
    [live.alerts, selectedAlertId],
  );

  const canDetermineImpact = useMemo(() => {
    if (!live.point) return false;
    return live.alerts.some((a) => a.hasGeometry);
  }, [live.point, live.alerts]);

  const legendItems = useMemo(
    () => mapLegendItems(live.alerts, {}),
    [live.alerts],
  );

  const pointForImpact = simulationMode ? live.point : live.point;

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      {simulationMode && <SimulationBanner onExit={handleExitSimulation} />}

      <Header
        locationLabel={locationLabel}
        dataStatus={live.dataStatus}
        activeAlertCount={live.alerts.filter((a) => {
          const end = a.ends ?? a.expires;
          return !end || end.getTime() > Date.now();
        }).length}
        simulationMode={simulationMode}
        lastRefreshedAt={live.lastRefreshedAt}
        onRefresh={handleRefresh}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleSimulation={() => setSimOpen(true)}
        canDetermineImpact={canDetermineImpact}
      />

      <main className="flex-1 mx-auto w-full max-w-layout px-4 sm:px-6 py-4 space-y-4">
        {/* Location search row */}
        <div className="panel p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <label className="field-label block mb-1.5">Find your location</label>
              <LocationSearch
                onSelect={handleSelectPlace}
                onUseCoordinates={handleUseCoords}
                currentLabel={locationLabel}
              />
            </div>
            {live.dataStatus.lastFetchError && !simulationMode && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-start gap-2 max-w-md">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{live.dataStatus.lastFetchError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: status + action panel first */}
        <div className="xl:hidden space-y-4">
          <LocalStatusPanel
            point={live.point}
            alerts={live.alerts}
            selectedAlertId={selectedAlertId}
          />
          <EmergencyActionPanel alert={selectedAlert} simulationMode={simulationMode} />
        </div>

        {/* Main grid: map (2/3) + side panel (1/3) */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Map column */}
          <div className="xl:col-span-2 space-y-4">
            <section className="panel overflow-hidden" aria-label="Impact map">
              <div className="panel-header">
                <h2 className="text-sm font-semibold text-ink">Personal Impact Map</h2>
                <span className="ml-auto text-[11px] text-ink-muted">
                  Click a polygon to select its alert
                </span>
              </div>
              <div className="h-[420px] sm:h-[520px] relative">
                <ImpactMap
                  point={live.point}
                  alerts={live.alerts}
                  selectedAlertId={selectedAlertId}
                  onSelectAlert={handleSelectAlert}
                  fitAlertId={fitAlertId}
                />
              </div>
              {/* Legend */}
              <div className="px-4 py-2.5 border-t border-line-soft flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {legendItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                      aria-hidden
                    />
                    {item.label}
                  </div>
                ))}
              </div>
            </section>

            <AlertList
              alerts={live.alerts}
              selectedId={selectedAlertId}
              onSelect={handleSelectAlert}
              simulationMode={simulationMode}
            />

            <ObservationsPanel
              observations={live.observations}
              loading={live.loading}
              error={null}
              simulationMode={simulationMode}
            />
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            <div className="hidden xl:block space-y-4">
              <LocalStatusPanel
                point={live.point}
                alerts={live.alerts}
                selectedAlertId={selectedAlertId}
              />
              <EmergencyActionPanel alert={selectedAlert} simulationMode={simulationMode} />
            </div>
            <AlertDetails
              alert={selectedAlert}
              point={pointForImpact}
              sourceNote={
                simulationMode
                  ? 'Synthetic fixture shaped like an NWS alert. Not a live alert.'
                  : 'Source: api.weather.gov active alerts. Timestamps preserved verbatim from the official response.'
              }
            />
          </div>
        </div>

        {/* Bottom: timeline + source info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TimelinePanel
            entries={live.timelineEntries}
            alerts={live.alerts}
            simulationMode={simulationMode}
          />
          <SourceInfoPanel simulationMode={simulationMode} />
        </div>

        <footer className="pt-2 pb-6 text-center text-[11px] text-ink-muted">
          AlertLens is an independent civic-information project using official U.S. National Weather
          Service data. It is not affiliated with or endorsed by the NWS. Always follow instructions
          from local officials during an emergency.
        </footer>
      </main>

      <SimulationLab
        open={simOpen}
        onClose={() => setSimOpen(false)}
        activeScenarioId={simScenarioId}
        onSelectScenario={handleSelectScenario}
        onExitSimulation={handleExitSimulation}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        refreshIntervalMs={refreshMs}
        onChangeRefreshInterval={setRefreshMs}
        attribution={[
          'Alert data: U.S. National Weather Service (api.weather.gov)',
          GEOCODE_ATTRIBUTION,
          'Map tiles: © OpenStreetMap contributors, © CARTO',
        ]}
      />
    </div>
  );
}

function SimulationBanner({ onExit }: { onExit: () => void }) {
  return (
    <div
      className="bg-red-600 text-white border-b-2 border-red-800"
      role="alert"
      aria-live="assertive"
    >
      <div className="mx-auto max-w-layout px-4 py-2 flex items-center gap-3">
        <AlertTriangle size={16} className="shrink-0" aria-hidden />
        <span className="text-xs sm:text-sm font-semibold tracking-wide uppercase">
          Simulation — Not Live Weather
        </span>
        <span className="hidden sm:inline text-xs text-red-100">
          You are viewing synthetic demonstration data.
        </span>
        <button
          type="button"
          onClick={onExit}
          className="ml-auto inline-flex items-center gap-1 rounded bg-white/15 hover:bg-white/25 px-2.5 py-1 text-xs font-medium"
        >
          <X size={12} aria-hidden /> Exit simulation
        </button>
      </div>
    </div>
  );
}

function SourceInfoPanel({ simulationMode }: { simulationMode: boolean }) {
  return (
    <section className="panel" aria-label="Source information">
      <div className="panel-header">
        <Info size={15} className="text-brand-500" aria-hidden />
        <h2 className="text-sm font-semibold text-ink">Official Source &amp; Data Notes</h2>
      </div>
      <div className="p-5 text-sm text-ink-soft space-y-3 leading-relaxed">
        <p>
          AlertLens draws active alerts from the U.S. National Weather Service public API at
          <span className="text-ink"> api.weather.gov</span>. It preserves official timestamps and
          shows the official description and instructions verbatim where available.
        </p>
        <p>
          Point-in-polygon impact is computed only when valid geometry is supplied by the source.
          AlertLens never fabricates a boundary from a county or zone description, and never labels
          an approximate polygon as official.
        </p>
        <p>
          The change timeline records only observations made during this session. It does not invent
          historical updates. An alert that disappears from a refresh is labeled "no longer
          returned" rather than "cancelled" unless the official source establishes cancellation.
        </p>
        {simulationMode && (
          <p className="text-red-700 font-medium">
            Simulation mode is active — data shown is synthetic and clearly labeled. It is never
            mixed with live records.
          </p>
        )}
        <p className="text-[11px] text-ink-muted">
          This is an independent project. It does not impersonate the NWS or use government seals.
          During a real emergency, follow instructions from local officials and official sources.
        </p>
      </div>
    </section>
  );
}

// Avoid unused-import TS error for ObservationSummary type re-exported via simulation path.
export type { NormalizedAlert, ObservationSummary };
