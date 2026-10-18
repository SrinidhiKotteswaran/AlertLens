import { AlertTriangle, ExternalLink, LifeBuoy, BookOpen } from 'lucide-react';
import type { NormalizedAlert } from '@/types/domain';
import {
  formatInstruction,
  HAZARD_SAFETY_LINKS,
  hazardClassReminder,
} from '@/lib/explanations';

export interface EmergencyActionPanelProps {
  alert: NormalizedAlert | null;
  simulationMode: boolean;
}

export function EmergencyActionPanel({ alert, simulationMode }: EmergencyActionPanelProps) {
  if (!alert) {
    return (
      <section className="panel" aria-label="Emergency action panel">
        <div className="panel-header">
          <LifeBuoy size={15} className="text-brand-500" aria-hidden />
          <h2 className="text-sm font-semibold text-ink">Emergency Action Panel</h2>
        </div>
        <div className="p-5 text-sm text-ink-muted">
          No alert selected. Choose an active alert to read its official instructions and relevant safety guidance.
        </div>
      </section>
    );
  }

  const instructions = formatInstruction(alert.instruction);
  const safetyLink = HAZARD_SAFETY_LINKS[alert.hazardCategory];
  const reminder = hazardClassReminder(alert.hazardCategory);

  return (
    <section
      className="panel"
      aria-label="Emergency action panel"
      style={{ borderColor: '#B3261E33' }}
    >
      <div
        className="panel-header"
        style={{ backgroundColor: '#B3261E0D', borderLeftColor: '#B3261E', borderLeftWidth: 4 }}
      >
        <AlertTriangle size={15} className="text-red-700" aria-hidden />
        <h2 className="text-sm font-semibold text-red-800">Official Instructions</h2>
      </div>

      <div className="p-5 space-y-4">
        {simulationMode && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-[11px] text-red-800">
            SIMULATION — instructions below are from a synthetic fixture, not a live alert.
          </div>
        )}

        {instructions.length > 0 ? (
          <div>
            <div className="field-label mb-1">From the official alert</div>
            <div className="text-sm text-ink leading-relaxed space-y-2">
              {instructions.map((p, i) => (
                <p key={i} className="font-medium">
                  {p}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            The official source did not include specific instructions with this alert. The
            hazard-class safety reference below is provided as a convenience and does not override
            instructions from local officials.
          </div>
        )}

        <div className="rounded-md border border-line-soft bg-canvas p-3">
          <div className="field-label flex items-center gap-1.5 mb-1">
            <BookOpen size={12} aria-hidden /> Hazard-class safety reference
          </div>
          <p className="text-xs text-ink-soft leading-relaxed">{reminder}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={alert.web ?? safetyLink.url}
            target="_blank"
            rel="noreferrer noopener"
            className="btn btn-primary"
          >
            Open official alert <ExternalLink size={13} aria-hidden />
          </a>
          <a
            href={safetyLink.url}
            target="_blank"
            rel="noreferrer noopener"
            className="btn"
          >
            {safetyLink.label} <ExternalLink size={13} aria-hidden />
          </a>
        </div>

        <p className="text-[10px] text-ink-muted leading-relaxed">
          AlertLens prioritizes instructions from the actual alert. It does not provide medical or
          emergency-response claims beyond official guidance, and will never tell you to ignore an
          alert or wait for visible evidence of a hazard.
        </p>
      </div>
    </section>
  );
}
