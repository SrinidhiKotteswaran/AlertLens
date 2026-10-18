import { useMemo } from 'react';
import {
  Clock,
  CalendarClock,
  RefreshCw,
  FileText,
  Info,
  AlertTriangle,
  Map,
  Tag,
  Gauge,
  Activity,
  ExternalLink,
} from 'lucide-react';
import type { NormalizedAlert, GeoPoint } from '@/types/domain';
import { computeImpact } from '@/lib/geometry';
import {
  hazardColor,
  severityColor,
  formatDescription,
  formatInstruction,
  alertKindLabel,
  alertKindExplanation,
  HAZARD_SAFETY_LINKS,
  hazardClassReminder,
} from '@/lib/explanations';
import { formatDateTime } from '@/lib/format';

export interface AlertDetailsProps {
  alert: NormalizedAlert | null;
  point: GeoPoint | null;
  sourceNote: string;
}

export function AlertDetails({ alert, point, sourceNote }: AlertDetailsProps) {
  const impact = useMemo(
    () => (alert ? computeImpact(point, alert.geometry) : null),
    [alert, point],
  );

  if (!alert) {
    return (
      <section className="panel" aria-label="Alert details">
        <div className="panel-header">
          <FileText size={15} className="text-brand-500" aria-hidden />
          <h2 className="text-sm font-semibold text-ink">Alert Details</h2>
        </div>
        <div className="p-6 text-sm text-ink-muted">
          Select an alert from the list or map to see its full explanation.
        </div>
      </section>
    );
  }

  const color = hazardColor(alert.hazardCategory);
  const sevColor = severityColor(alert.severity);
  const description = formatDescription(alert.description);
  const instruction = formatInstruction(alert.instruction);
  const kind = alertKindLabel(alert.event);
  const kindExplanation = alertKindExplanation(alert.event);
  const safetyLink = HAZARD_SAFETY_LINKS[alert.hazardCategory];

  return (
    <section className="panel" aria-label="Alert details">
      <div className="panel-header" style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <h2 className="text-sm font-semibold text-ink">Alert Details</h2>
        <a
          href={alert.web ?? '#'}
          target="_blank"
          rel="noreferrer noopener"
          className="ml-auto text-xs text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
        >
          Official source <ExternalLink size={11} aria-hidden />
        </a>
      </div>

      <div className="p-5 space-y-4">
        {/* Headline */}
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-muted">Event</div>
          <h3 className="text-base font-semibold text-ink mt-0.5">{alert.event}</h3>
          {alert.headline && (
            <p className="text-sm text-ink-soft mt-1 leading-relaxed">{alert.headline}</p>
          )}
        </div>

        {/* Summary */}
        <div className="rounded-md bg-brand-50/70 border border-brand-100 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-700">
            <Info size={12} aria-hidden /> Plain-English summary
          </div>
          <p className="mt-1 text-sm text-ink-soft leading-relaxed">{alert.summary}</p>
        </div>

        {/* Official fields */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field icon={<Tag size={13} />} label="Severity">
            <span
              className="chip"
              style={{ color: sevColor, borderColor: sevColor, backgroundColor: `${sevColor}12` }}
            >
              {alert.severity}
            </span>
          </Field>
          <Field icon={<Activity size={13} />} label="Urgency">
            <span className="chip border-line text-ink-soft bg-white">{alert.urgency}</span>
          </Field>
          <Field icon={<Gauge size={13} />} label="Certainty">
            <span className="chip border-line text-ink-soft bg-white">{alert.certainty}</span>
          </Field>
          <Field icon={<Map size={13} />} label="Alert kind">
            <span className="chip border-line text-ink-soft bg-white capitalize">{kind}</span>
          </Field>
        </div>

        {/* Kind explanation */}
        <p className="text-xs text-ink-soft leading-relaxed">{kindExplanation}</p>

        {/* Impact state */}
        {impact && (
          <div className="rounded-md border border-line bg-canvas p-3 text-sm">
            <div className="field-label mb-1">Your impact state</div>
            <ImpactText state={impact.state} />
          </div>
        )}

        {/* Times */}
        <div className="rounded-md border border-line-soft divide-y divide-line-soft">
          <TimeRow icon={<Clock size={13} />} label="Sent">{formatDateTime(alert.sent)}</TimeRow>
          <TimeRow icon={<CalendarClock size={13} />} label="Effective">{formatDateTime(alert.effective)}</TimeRow>
          <TimeRow icon={<CalendarClock size={13} />} label="Expires">{formatDateTime(alert.expires)}</TimeRow>
          <TimeRow icon={<RefreshCw size={13} />} label="Last updated">{formatDateTime(alert.updated)}</TimeRow>
        </div>

        {/* Affected area */}
        <div>
          <div className="field-label flex items-center gap-1.5">
            <Map size={12} aria-hidden /> Affected area
          </div>
          <p className="mt-1 text-sm text-ink-soft leading-relaxed">{alert.areaDesc}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {alert.hasGeometry
              ? 'A validated boundary was supplied and rendered on the map.'
              : 'No boundary geometry was supplied — area is described in words only.'}
          </p>
        </div>

        {/* Official description */}
        {description.length > 0 && (
          <div>
            <div className="field-label flex items-center gap-1.5 mb-1">
              <FileText size={12} aria-hidden /> Official description
            </div>
            <div className="text-sm text-ink-soft leading-relaxed space-y-2 max-h-56 overflow-y-auto pr-1">
              {description.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}

        {/* Caveats */}
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <AlertTriangle size={12} aria-hidden /> What AlertLens can and cannot establish
          </div>
          <ul className="mt-1.5 list-disc list-outside ml-4 text-xs text-amber-800 space-y-1 leading-relaxed">
            {alert.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>

        <p className="text-[10px] text-ink-muted">{sourceNote}</p>
      </div>
    </section>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="field-label flex items-center gap-1">{icon}{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function TimeRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="meta-row">
      <span className="text-ink-muted inline-flex items-center gap-1.5">
        {icon} {label}
      </span>
      <span className="text-ink text-right">{children}</span>
    </div>
  );
}

function ImpactText({ state }: { state: 'inside' | 'outside' | 'unknown' }) {
  if (state === 'inside') {
    return <span className="text-red-700 font-medium">Inside supplied boundary</span>;
  }
  if (state === 'outside') {
    return (
      <span className="text-amber-700 font-medium">
        Outside supplied boundary — does not guarantee safety
      </span>
    );
  }
  return <span className="text-ink-soft">Location impact unknown</span>;
}

export { hazardClassReminder, HAZARD_SAFETY_LINKS };
