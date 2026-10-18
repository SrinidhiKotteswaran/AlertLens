import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, BookOpen } from 'lucide-react';
import type { NormalizedAlert } from '@/types/domain';
import { formatInstruction, HAZARD_SAFETY_LINKS, hazardClassReminder } from '@/lib/explanations';

export interface EmergencyActionPanelProps {
  alert: NormalizedAlert | null;
  simulationMode: boolean;
}

function safetyChecklist(alert: NormalizedAlert): string[] {
  const event = alert.event.toLowerCase();
  if (/flash flood|flood/.test(event)) return [
    'Move to higher ground if flooding threatens your area.',
    'Never walk, swim, or drive through floodwater.',
    'Keep monitoring official alerts and follow evacuation instructions.',
  ];
  if (/tornado|funnel cloud/.test(event)) return [
    'Move to a sturdy building and shelter in a small interior room on the lowest floor.',
    'Stay away from windows and exterior walls.',
    'Keep monitoring official warnings and local emergency instructions.',
  ];
  if (/thunder|lightning|hail/.test(event)) return [
    'Go inside a substantial building or hard-topped vehicle.',
    'Stay away from windows and avoid using wired electrical equipment during lightning.',
    'Wait for the official all-clear before returning outdoors.',
  ];
  if (/snow|ice|winter|freezing/.test(event)) return [
    'Avoid unnecessary travel and check road conditions before leaving.',
    'Watch for icy surfaces and keep clear of downed wires.',
    'Follow local instructions and monitor updated forecasts.',
  ];
  if (/wind|hurricane|tropical|severe/.test(event)) return [
    'Move indoors and stay away from windows.',
    'Keep clear of damaged trees, structures, and downed power lines.',
    'Follow official warnings and instructions from local emergency officials.',
  ];
  return [
    'Read the official alert and follow its specific instructions.',
    'Move away from the immediate hazard if you can do so safely.',
    'Keep monitoring official alerts and instructions from local officials.',
  ];
}

export function EmergencyActionPanel({ alert, simulationMode }: EmergencyActionPanelProps) {
  const [checked, setChecked] = useState<boolean[]>([]);
  useEffect(() => setChecked([]), [alert?.id]);
  if (!alert) return null;

  const instructions = formatInstruction(alert.instruction);
  const safetyLink = HAZARD_SAFETY_LINKS[alert.hazardCategory];
  const reminder = hazardClassReminder(alert.hazardCategory);
  const checklist = safetyChecklist(alert);

  return (
    <section className="panel overflow-hidden" aria-label="Emergency action panel">
      <div className="panel-header" style={{ backgroundColor: '#B3261E0D', borderLeftColor: '#B3261E', borderLeftWidth: 4 }}>
        <AlertTriangle size={16} className="text-red-700" aria-hidden />
        <h2 className="text-sm font-semibold text-red-800">What to Do Now</h2>
      </div>
      <div className="space-y-4 p-4">
        {simulationMode && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">SIMULATION — not a live alert.</div>}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Quick safety checklist</div>
          <ul className="space-y-2">
            {checklist.map((item, index) => <li key={item}><label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line-soft p-3 text-sm leading-relaxed text-ink hover:bg-slate-50"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-blue-700" checked={Boolean(checked[index])} onChange={(event) => setChecked((current) => checklist.map((_, i) => i === index ? event.target.checked : Boolean(current[i])))} /><span className={checked[index] ? 'text-ink-muted line-through' : ''}>{item}</span></label></li>)}
          </ul>
        </div>
        {instructions.length > 0 && <div className="rounded-lg border border-red-100 bg-red-50/60 p-3"><div className="mb-1 text-xs font-semibold text-red-800">Official alert instructions</div><div className="space-y-2 text-sm leading-relaxed text-ink">{instructions.map((item, index) => <p key={index}>{item}</p>)}</div></div>}
        <div className="rounded-lg border border-line-soft bg-canvas p-3"><div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink"><BookOpen size={12} /> Safety reference</div><p className="text-xs leading-relaxed text-ink-soft">{reminder}</p></div>
        <div className="flex flex-wrap gap-2"><a href={simulationMode ? safetyLink.url : (alert.web ?? safetyLink.url)} target="_blank" rel="noreferrer noopener" className="btn btn-primary">{simulationMode ? 'Open safety reference' : 'Open official alert'} <ExternalLink size={13} /></a><a href={safetyLink.url} target="_blank" rel="noreferrer noopener" className="btn">{safetyLink.label} <ExternalLink size={13} /></a></div>
        <p className="text-[10px] leading-relaxed text-ink-muted">This checklist is general guidance, not a substitute for the official alert. Follow local emergency officials. {checked.every(Boolean) ? 'Checklist reviewed.' : `${checked.filter(Boolean).length} of ${checklist.length} actions checked.`}</p>
      </div>
    </section>
  );
}
