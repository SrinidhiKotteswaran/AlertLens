import { useState } from 'react';
import { ListChecks, Map as MapIcon } from 'lucide-react';
import type { NormalizedAlert } from '@/types/domain';
import { hazardColor, severityColor } from '@/lib/explanations';
import { isAlertExpired, isAlertUpcoming } from '@/lib/geometry';
import { formatRelative } from '@/lib/format';

export interface AlertListProps {
  alerts: NormalizedAlert[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  simulationMode: boolean;
}

export function AlertList({ alerts, selectedId, onSelect, simulationMode }: AlertListProps) {
  const [showAll, setShowAll] = useState(false);

  if (alerts.length === 0) {
    return (
      <section className="panel" aria-label="Active alerts">
        <div className="panel-header">
          <ListChecks size={15} className="text-brand-500" aria-hidden />
          <h2 className="text-sm font-semibold text-ink">Active Alerts</h2>
        </div>
        <div className="p-5 text-sm text-ink-muted">
          {simulationMode
            ? 'No simulated alerts for this scenario.'
            : 'No active alerts were returned for the selected location.'}
        </div>
      </section>
    );
  }

  const expired = alerts.filter((a) => isAlertExpired(a));
  const upcoming = alerts.filter((a) => !isAlertExpired(a) && isAlertUpcoming(a));
  const active = alerts.filter((a) => !isAlertExpired(a) && !isAlertUpcoming(a));
  const visibleActive = showAll ? active : active.slice(0, 5);
  const visibleUpcoming = showAll ? upcoming : upcoming.slice(0, 5);

  return (
    <section className="panel" aria-label="Active alerts">
      <div className="panel-header">
        <ListChecks size={15} className="text-brand-500" aria-hidden />
        <h2 className="text-sm font-semibold text-ink">Active Alerts</h2>
        <span className="ml-auto text-[11px] text-ink-muted">
          {active.length} active{upcoming.length > 0 ? ` · ${upcoming.length} upcoming` : ''}{expired.length > 0 ? ` · ${expired.length} expired` : ''}
        </span>
      </div>
      <ul className="divide-y divide-line-soft">
        {visibleActive.map((a) => {
          const color = hazardColor(a.hazardCategory);
          const sev = severityColor(a.severity);
          const selected = a.id === selectedId;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onSelect(a.id)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  selected ? 'bg-brand-50' : 'hover:bg-brand-50/50'
                }`}
                aria-pressed={selected}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="mt-0.5 inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink leading-snug">{a.event}</div>
                    {a.headline && (
                      <div className="text-xs text-ink-soft mt-0.5 line-clamp-2 leading-snug">
                        {a.headline}
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span
                        className="chip"
                        style={{ color: sev, borderColor: sev, backgroundColor: `${sev}10` }}
                      >
                        {a.severity}
                      </span>
                      <span className="chip border-line text-ink-soft bg-white">
                        {a.urgency}
                      </span>
                      {a.hasGeometry ? (
                        <span className="chip border-line text-ink-soft bg-white">
                          <MapIcon size={10} aria-hidden /> Has boundary
                        </span>
                      ) : (
                        <span className="chip border-amber-200 text-amber-700 bg-amber-50">
                          No boundary
                        </span>
                      )}
                      <span className="text-ink-muted">
                        Expires {formatRelative(a.expires ?? a.ends)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {upcoming.length > 0 && (
        <div className="border-t border-line-soft">
          <div className="px-4 py-2 text-[10px] uppercase tracking-wide text-ink-muted">
            Upcoming — not in effect yet
          </div>
          <ul className="divide-y divide-line-soft">
            {visibleUpcoming.map((a) => {
              const color = hazardColor(a.hazardCategory);
              const sev = severityColor(a.severity);
              const selected = a.id === selectedId;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(a.id)}
                    className={`w-full text-left px-4 py-3 transition-colors ${selected ? 'bg-brand-50' : 'hover:bg-brand-50/50'}`}
                    aria-pressed={selected}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-block h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink leading-snug">{a.event}</div>
                        {a.headline && <div className="text-xs text-ink-soft mt-0.5 line-clamp-2 leading-snug">{a.headline}</div>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                          <span className="chip" style={{ color: sev, borderColor: sev, backgroundColor: `${sev}10` }}>{a.severity}</span>
                          <span className="chip border-amber-200 text-amber-800 bg-amber-50">Upcoming</span>
                          <span className="text-ink-muted">Starts {formatRelative(a.onset ?? a.effective)}</span>
                          {a.hasGeometry ? <span className="chip border-line text-ink-soft bg-white"><MapIcon size={10} aria-hidden /> Has boundary</span> : <span className="chip border-amber-200 text-amber-700 bg-amber-50">No boundary</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {(active.length > 5 || upcoming.length > 5) && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full text-center py-2 text-xs text-brand-600 hover:bg-brand-50/50 border-t border-line-soft"
        >
          Show all {active.length + upcoming.length} alerts
        </button>
      )}

      {showAll && expired.length > 0 && (
        <div className="border-t border-line-soft">
          <div className="px-4 py-2 text-[10px] uppercase tracking-wide text-ink-muted">
            Expired (for reference)
          </div>
          <ul className="divide-y divide-line-soft">
            {expired.map((a) => {
              const color = hazardColor(a.hazardCategory);
              const selected = a.id === selectedId;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(a.id)}
                    className={`w-full text-left px-4 py-2 opacity-75 hover:opacity-100 ${
                      selected ? 'bg-brand-50' : 'hover:bg-brand-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      <span className="text-xs font-medium text-ink">{a.event}</span>
                      <span className="ml-auto text-[10px] text-ink-muted">expired</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
