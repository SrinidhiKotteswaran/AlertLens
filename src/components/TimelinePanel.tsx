import { History, Plus, RefreshCw, Clock, PencilLine, ShieldQuestion, Activity, Gauge } from 'lucide-react';
import type { TimelineEntry, NormalizedAlert } from '@/types/domain';
import { formatDateTime } from '@/lib/format';
import { hazardColor } from '@/lib/explanations';

export interface TimelinePanelProps {
  entries: TimelineEntry[];
  alerts: NormalizedAlert[];
  simulationMode: boolean;
}

const CHANGE_META: Record<
  TimelineEntry['changeType'],
  { label: string; icon: React.ReactNode; color: string }
> = {
  new: { label: 'Newly detected', icon: <Plus size={13} />, color: '#2A8C4A' },
  updated: { label: 'Metadata updated', icon: <RefreshCw size={13} />, color: '#377DB5' },
  expires_changed: { label: 'Expiration changed', icon: <Clock size={13} />, color: '#C4661F' },
  instruction_changed: { label: 'Instructions updated', icon: <PencilLine size={13} />, color: '#B3261E' },
  severity_changed: { label: 'Severity changed', icon: <Activity size={13} />, color: '#7A1212' },
  certainty_changed: { label: 'Certainty changed', icon: <Gauge size={13} />, color: '#7A1212' },
  not_returned: { label: 'No longer returned as active', icon: <ShieldQuestion size={13} />, color: '#6B7280' },
  no_change: { label: 'No change', icon: <RefreshCw size={13} />, color: '#6B7280' },
};

export function TimelinePanel({ entries, alerts, simulationMode }: TimelinePanelProps) {
  const alertById = new Map(alerts.map((a) => [a.id, a]));
  const ordered = [...entries].sort((a, b) => b.observedAt.getTime() - a.observedAt.getTime());

  return (
    <section className="panel" aria-label="Alert change timeline">
      <div className="panel-header">
        <History size={15} className="text-brand-500" aria-hidden />
        <h2 className="text-sm font-semibold text-ink">Alert Change Timeline</h2>
        <span className="ml-auto text-[11px] text-ink-muted">Session observations only</span>
      </div>
      <div className="p-5">
        {simulationMode && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-800">
            SIMULATION — timeline reflects synthetic fixtures, not live alert history.
          </div>
        )}

        {ordered.length === 0 ? (
          <div className="text-sm text-ink-muted py-6 text-center">
            No changes have been observed yet this session. Refresh to record a new observation.
          </div>
        ) : (
          <ol className="relative space-y-3">
            {ordered.map((e, i) => {
              const meta = CHANGE_META[e.changeType];
              const a = alertById.get(e.alertId);
              const color = a ? hazardColor(a.hazardCategory) : meta.color;
              return (
                <li key={`${e.alertId}-${i}`} className="flex gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    {i < ordered.length - 1 && (
                      <span className="w-px flex-1 bg-line mt-1" aria-hidden />
                    )}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                      <span style={{ color: meta.color }} className="inline-flex items-center gap-1">
                        {meta.icon}
                        {meta.label}
                      </span>
                    </div>
                    <div className="text-sm text-ink-soft mt-0.5 leading-snug">{e.summary}</div>
                    <div className="text-[11px] text-ink-muted mt-1">
                      {formatDateTime(e.observedAt)}
                      {e.sourceTimestampIso && (
                        <>
                          {' '}· source: {new Date(e.sourceTimestampIso).toLocaleString()}
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        <p className="mt-4 text-[10px] text-ink-muted leading-relaxed">
          AlertLens records only changes it actually observes during this session. It does not
          invent historical updates. An alert no longer returned as active may have expired, been
          filtered, or reflect a data issue — it is not labeled "cancelled" unless the official
          source establishes cancellation.
        </p>
      </div>
    </section>
  );
}
