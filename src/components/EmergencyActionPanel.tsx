import { useEffect, useState } from 'react';
import { ExternalLink, BookOpen } from 'lucide-react';
import type { NormalizedAlert } from '@/types/domain';
import { HAZARD_SAFETY_LINKS, hazardClassReminder } from '@/lib/explanations';

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
  if (/frost/.test(event)) return [
    'Cover frost-sensitive plants with suitable fabric when practical, and remove covers once temperatures rise.',
    'Bring pets indoors and check on anyone who may need help staying warm.',
    'Follow the official alert timing and keep monitoring updated local forecasts.',
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

  const safetyLink = HAZARD_SAFETY_LINKS[alert.hazardCategory];
  const reminder = hazardClassReminder(alert.hazardCategory);
  const checklist = safetyChecklist(alert);

  return (
    <section aria-label="Emergency action checklist">
      <div className="space-y-3 p-3">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Quick safety checklist</div>
          <ul className="space-y-2">
            {checklist.map((item, index) => <li key={item}><label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line-soft p-3 text-sm leading-relaxed text-ink hover:bg-slate-50"><input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-blue-700" checked={Boolean(checked[index])} onChange={(event) => setChecked((current) => checklist.map((_, i) => i === index ? event.target.checked : Boolean(current[i])))} /><span className={checked[index] ? 'text-ink-muted line-through' : ''}>{item}</span></label></li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-line-soft bg-canvas p-3"><div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink"><BookOpen size={12} /> Safety reference</div><p className="text-xs leading-relaxed text-ink-soft">{reminder}</p></div>
        <div className="flex flex-wrap gap-2"><a href={simulationMode ? safetyLink.url : (alert.web ?? safetyLink.url)} target="_blank" rel="noreferrer noopener" className="btn btn-primary">{simulationMode ? 'Open safety reference' : 'Open official alert'} <ExternalLink size={13} /></a><a href={safetyLink.url} target="_blank" rel="noreferrer noopener" className="btn">{safetyLink.label} <ExternalLink size={13} /></a></div>
        <p className="text-[10px] leading-relaxed text-ink-muted">General guidance only; follow official instructions. {checked.every(Boolean) ? 'Checklist reviewed.' : `${checked.filter(Boolean).length} of ${checklist.length} actions checked.`}</p>
      </div>
    </section>
  );
}
