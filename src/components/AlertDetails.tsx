import { useMemo } from 'react';
import { ExternalLink, MapPin, Clock, AlertTriangle } from 'lucide-react';
import type { NormalizedAlert, GeoPoint, ImpactResult } from '@/types/domain';
import { computeImpact } from '@/lib/geometry';
import { hazardColor, severityColor, formatDescription, formatInstruction, HAZARD_SAFETY_LINKS } from '@/lib/explanations';
import { formatDateTime } from '@/lib/format';

export interface AlertDetailsProps {
  alert: NormalizedAlert | null;
  point: GeoPoint | null;
  simulationMode?: boolean;
  recordingMode?: boolean;
  sourceNote: string;
}

export function AlertDetails({ alert, point, simulationMode = false, recordingMode = false, sourceNote }: AlertDetailsProps) {
  const impact = useMemo<ImpactResult | null>(() => {
    if (!alert) return null;
    if (!point) return { state: 'unknown', reason: 'Select a location to compare it with the supplied alert boundary.', matchedRingIndex: null };
    return computeImpact(point, alert.geometry);
  }, [alert, point]);
  if (!alert) return null;

  const color = hazardColor(alert.hazardCategory);
  const sevColor = severityColor(alert.severity);
  const safetyLink = HAZARD_SAFETY_LINKS[alert.hazardCategory];
  const sourceUrl = simulationMode ? safetyLink.url : (alert.web ?? safetyLink.url);
  const description = formatDescription(alert.description);
  const instructions = formatInstruction(alert.instruction);

  return (
    <section className="panel overflow-hidden" aria-label="Alert details">
      <div className="panel-header" style={{ borderLeftColor: color, borderLeftWidth: 4 }}>
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
        <h2 className="text-sm font-semibold text-ink">Alert details</h2>
        <a href={sourceUrl} target="_blank" rel="noreferrer noopener" className="ml-auto inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700">
          {simulationMode ? 'Safety reference' : 'Official source'} <ExternalLink size={11} aria-hidden />
        </a>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-base font-semibold text-ink">{alert.event}</h3>
          {alert.headline && <p className="mt-1 text-sm leading-relaxed text-ink-soft">{alert.headline}</p>}
        </div>
        <p className="rounded-lg border border-brand-100 bg-brand-50/70 p-3 text-sm leading-relaxed text-ink">{alert.summary || 'Open the official alert for the latest details and instructions.'}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border px-2.5 py-1 font-semibold" style={{ color: sevColor, borderColor: sevColor, backgroundColor: `${sevColor}12` }}>{alert.severity}</span>
          {alert.expires && <span className="inline-flex items-center gap-1 text-ink-muted"><Clock size={12} /> Expires {formatDateTime(alert.expires)}</span>}
        </div>
        {recordingMode && alert.event === 'Frost Advisory' ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <div className="font-semibold">Middletown, Delaware is within the affected region</div>
            <p className="mt-1 text-xs leading-relaxed">The highlighted area on the map shows an approximate sketch of the Frost Advisory coverage described by the National Weather Service.</p>
            <p className="mt-1 text-xs leading-relaxed">Follow the official NWS alert and local safety guidance. Protect sensitive outdoor plants from frost, and check the alert details for timing and instructions.</p>
          </div>
        ) : impact && (
          <div className={`rounded-lg border p-3 text-sm ${impact.state === 'inside' ? 'border-red-200 bg-red-50 text-red-800' : impact.state === 'outside' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
            <div className="font-semibold">{impact.state === 'inside' ? 'Selected location is inside the supplied alert boundary' : impact.state === 'outside' ? 'Selected location is outside the supplied boundary' : 'Point-level impact is unknown'}</div>
            <p className="mt-1 text-xs leading-relaxed">{impact.reason}</p>
            <p className="mt-1 text-xs font-medium">This boundary comparison cannot establish overall safety. Follow the official alert and local emergency instructions.</p>
          </div>
        )}
        {instructions.length > 0 && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-muted">Official instructions</h4>
            <ul className="space-y-1.5 text-sm leading-relaxed text-ink">{instructions.slice(0, 4).map((item, i) => <li key={i} className="flex gap-2"><span aria-hidden>•</span><span>{item}</span></li>)}</ul>
          </div>
        )}
        <div className="flex items-start gap-2 text-xs text-ink-muted"><MapPin size={13} className="mt-0.5 shrink-0" /><span>{alert.areaDesc}</span></div>
        {description.length > 0 && <details className="rounded-lg border border-line-soft px-3 py-2"><summary className="cursor-pointer text-xs font-medium text-ink-soft">View full NWS description</summary><div className="mt-2 space-y-2 text-xs leading-relaxed text-ink-soft">{description.map((p, i) => <p key={i}>{p}</p>)}</div></details>}
        <p className="text-[10px] text-ink-muted"><AlertTriangle size={10} className="mr-1 inline" />{sourceNote} Follow official emergency instructions.</p>
      </div>
    </section>
  );
}

