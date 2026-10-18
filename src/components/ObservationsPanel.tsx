import { CloudSun, Gauge, Wind, Droplets, Thermometer, Compass } from 'lucide-react';
import type { ObservationSummary } from '@/types/domain';
import { formatDateTime } from '@/lib/format';

export interface ObservationsPanelProps {
  observations: ObservationSummary[];
  loading: boolean;
  error: string | null;
  simulationMode: boolean;
}

export function ObservationsPanel({
  observations,
  loading,
  error,
  simulationMode,
}: ObservationsPanelProps) {
  return (
    <section className="panel" aria-label="Nearby observations">
      <div className="panel-header">
        <CloudSun size={15} className="text-brand-500" aria-hidden />
        <h2 className="text-sm font-semibold text-ink">Nearby Observations</h2>
        <span className="ml-auto text-[11px] text-ink-muted">Not a forecast</span>
      </div>
      <div className="p-5">
        {simulationMode && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-800">
            SIMULATION — observation data is synthetic.
          </div>
        )}

        {loading && (
          <div className="text-sm text-ink-muted py-3">Loading nearby station data…</div>
        )}

        {error && !loading && (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {!loading && !error && observations.length === 0 && (
          <div className="text-sm text-ink-muted py-3">
            No station observations available for this location.
          </div>
        )}

        {observations.length > 0 && (
          <ul className="space-y-3">
            {observations.map((o) => (
              <li key={o.stationId} className="rounded-md border border-line-soft p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">
                      {o.stationName}
                    </div>
                    <div className="text-[11px] text-ink-muted">Station {o.stationId}</div>
                  </div>
                  <div className="text-[11px] text-ink-muted text-right shrink-0">
                    {o.timestamp ? formatDateTime(o.timestamp) : 'No timestamp'}
                  </div>
                </div>

                {o.description && (
                  <div className="mt-1 text-xs text-ink-soft">{o.description}</div>
                )}

                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <Metric
                    icon={<Thermometer size={12} />}
                    label="Temp"
                    value={o.temperatureC === null ? '—' : `${o.temperatureC} °C`}
                  />
                  <Metric
                    icon={<Wind size={12} />}
                    label="Wind"
                    value={o.windKph === null ? '—' : `${o.windKph} kph`}
                  />
                  <Metric
                    icon={<Compass size={12} />}
                    label="Dir"
                    value={o.windDirectionDeg === null ? '—' : `${o.windDirectionDeg}°`}
                  />
                  <Metric
                    icon={<Droplets size={12} />}
                    label="Humidity"
                    value={o.humidityPct === null ? '—' : `${o.humidityPct}%`}
                  />
                  <Metric
                    icon={<Gauge size={12} />}
                    label="Precip (1h)"
                    value={o.precipitationMm === null ? '—' : `${o.precipitationMm} mm`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-[10px] text-ink-muted leading-relaxed">
          Observations are kept visually separate from alerts and forecasts. Clear skies or calm
          observations do not invalidate an official warning — a nearby station may simply not
          report the hazard. Alert polygons are official alert areas, not live storm radar imagery.
        </p>
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded bg-canvas px-2 py-1">
      <span className="text-ink-muted">{icon}</span>
      <span className="text-ink-muted">{label}</span>
      <span className="ml-auto text-ink font-medium">{value}</span>
    </div>
  );
}
