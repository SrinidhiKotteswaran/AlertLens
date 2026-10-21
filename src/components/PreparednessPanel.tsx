import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, HeartHandshake, PawPrint, RotateCcw, Users } from 'lucide-react';
import type { NormalizedAlert } from '@/types/domain';

type SupportNeed = 'older-adult' | 'medical-equipment' | 'pets';

interface ActionItem {
  id: string;
  title: string;
  detail: string;
  audience?: SupportNeed;
}

interface PreparednessPanelProps {
  alerts: NormalizedAlert[];
  dataOk: boolean;
  isStale: boolean;
  coverageWarning: string | null;
  simulationMode: boolean;
}

const SUPPORT_OPTIONS: { id: SupportNeed; label: string; description: string; icon: typeof Users }[] = [
  { id: 'older-adult', label: 'Older adult', description: 'Check-in and mobility planning', icon: Users },
  { id: 'medical-equipment', label: 'Medical equipment', description: 'Power-dependent equipment planning', icon: HeartHandshake },
  { id: 'pets', label: 'Pets', description: 'Pet supplies and shelter planning', icon: PawPrint },
];

function buildChecklist(alerts: NormalizedAlert[], needs: SupportNeed[]): ActionItem[] {
  const events = alerts.map((alert) => alert.event.toLowerCase()).join(' ');
  const items: ActionItem[] = [];

  if (/tornado/.test(events)) {
    items.push(
      { id: 'tornado-shelter', title: 'Identify sturdy shelter now', detail: 'Choose a small interior room on the lowest floor, away from windows.' },
      { id: 'tornado-supplies', title: 'Keep essentials within reach', detail: 'Bring a charged phone, flashlight, shoes, and any needed medication to your shelter area.' },
    );
  } else if (/flash flood|flood|coastal flood|flood watch/.test(events)) {
    items.push(
      { id: 'flood-route', title: 'Plan a route away from flood-prone areas', detail: 'Follow official evacuation instructions and never walk or drive through floodwater.' },
      { id: 'flood-alerts', title: 'Keep alerts reachable', detail: 'Enable official local alerts and keep your phone charged if possible.' },
    );
  } else if (/thunder|lightning|hail/.test(events)) {
    items.push(
      { id: 'storm-inside', title: 'Plan to get indoors promptly', detail: 'Use a substantial building or hard-topped vehicle; avoid water and isolated trees.' },
      { id: 'storm-power', title: 'Prepare for a possible interruption', detail: 'Charge devices and use flashlights rather than candles if power is lost.' },
    );
  } else if (/snow|ice|winter|freezing|blizzard/.test(events)) {
    items.push(
      { id: 'winter-travel', title: 'Review travel plans', detail: 'Avoid unnecessary travel and check official road conditions before leaving.' },
      { id: 'winter-warmth', title: 'Gather warm essentials', detail: 'Keep warm layers, water, needed medication, and a charged phone accessible.' },
    );
  } else if (/heat|excessive heat/.test(events)) {
    items.push(
      { id: 'heat-cool', title: 'Plan access to a cool place', detail: 'Use an air-conditioned location if available and follow local heat guidance.' },
      { id: 'heat-water', title: 'Prepare water and check-ins', detail: 'Drink water regularly and check official guidance for symptoms that need urgent care.' },
    );
  } else if (/wind|hurricane|tropical|severe/.test(events)) {
    items.push(
      { id: 'wind-inside', title: 'Secure your indoor plan', detail: 'Stay indoors away from windows when advised and keep clear of downed wires.' },
      { id: 'wind-charged', title: 'Charge essential devices', detail: 'Charge phones and power banks, and keep a flashlight easy to find.' },
    );
  } else {
    items.push(
      { id: 'official-alert', title: 'Read the official alert', detail: 'Check the listed timing, affected area, and instructions from the National Weather Service.' },
      { id: 'essentials', title: 'Prepare a small essentials kit', detail: 'Keep water, needed medication, a flashlight, a phone charger, and important contacts accessible.' },
    );
  }

  items.push({
    id: 'official-updates',
    title: 'Keep official updates available',
    detail: 'Follow the latest National Weather Service and local emergency-management instructions.',
  });

  if (needs.includes('older-adult')) {
    items.push({
      id: 'older-checkin',
      title: 'Set up a check-in plan',
      detail: 'Agree on who will check in, how to contact them, and what help is needed for mobility or transportation.',
      audience: 'older-adult',
    });
  }
  if (needs.includes('medical-equipment')) {
    items.push({
      id: 'medical-backup',
      title: 'Review your equipment backup plan',
      detail: 'If equipment depends on electricity, ask its care team or supplier about backup power, outage steps, and who to contact. Do not wait for an outage to clarify the plan.',
      audience: 'medical-equipment',
    });
  }
  if (needs.includes('pets')) {
    items.push({
      id: 'pet-kit',
      title: 'Prepare pet essentials',
      detail: 'Gather food, water, leash or carrier, medication, and vaccination records; check shelter rules before traveling.',
      audience: 'pets',
    });
  }

  return items;
}

export function PreparednessPanel({ alerts, dataOk, isStale, coverageWarning, simulationMode }: PreparednessPanelProps) {
  const [needs, setNeeds] = useState<SupportNeed[]>([]);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  const checklist = useMemo(() => buildChecklist(alerts, needs), [alerts, needs]);
  const activeAlertNames = [...new Set(alerts.map((alert) => alert.event))];
  const hasAlert = alerts.length > 0;
  const uncertain = !dataOk || isStale || Boolean(coverageWarning);
  const visibleChecklist = showAll ? checklist : checklist.slice(0, 5);
  const completedCount = checklist.filter((item) => checkedIds.includes(item.id)).length;

  const toggleNeed = (id: SupportNeed) => {
    setNeeds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setCheckedIds([]);
  };

  const toggleChecked = (id: string) => {
    setCheckedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <section className="panel overflow-hidden" aria-labelledby="preparedness-heading">
      <div className="panel-header">
        <ClipboardCheck size={16} className="text-brand-600" aria-hidden />
        <div>
          <h2 id="preparedness-heading" className="text-sm font-semibold text-ink">Preparedness planner</h2>
          <p className="text-[11px] text-ink-muted">Optional checklist tailored to your needs</p>
        </div>
      </div>
      <div className="space-y-4 p-4">
        {simulationMode && <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-800">DEMO MODE — this checklist uses synthetic scenario data.</div>}
        {hasAlert ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="text-xs font-semibold text-amber-900">Checklist based on displayed alert{activeAlertNames.length === 1 ? '' : 's'}</div>
            <p className="mt-1 text-xs leading-relaxed text-amber-800">{activeAlertNames.slice(0, 3).join(' · ')}{activeAlertNames.length > 3 ? ' · and more' : ''}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-800">Everyday readiness checklist</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">No active alert is currently listed here. These are general preparedness steps, not a statement that conditions are safe.</p>
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-ink">Who are you planning for? <span className="font-normal text-ink-muted">(optional)</span></legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SUPPORT_OPTIONS.map(({ id, label, description, icon: Icon }) => {
              const selected = needs.includes(id);
              return (
                <button key={id} type="button" aria-pressed={selected} onClick={() => toggleNeed(id)} className={`flex items-start gap-2 rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${selected ? 'border-brand-500 bg-brand-50' : 'border-line-soft bg-white hover:bg-slate-50'}`}>
                  <Icon size={16} className={selected ? 'mt-0.5 shrink-0 text-brand-700' : 'mt-0.5 shrink-0 text-ink-muted'} aria-hidden />
                  <span><span className="block text-xs font-semibold text-ink">{label}</span><span className="mt-0.5 block text-[10px] leading-relaxed text-ink-muted">{description}</span><span className="sr-only">{selected ? 'Selected' : 'Not selected'}</span></span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-ink-muted">Your selections stay in this page session and are not sent to a server. Choose only what is useful to your plan.</p>
        </fieldset>

        {uncertain && !simulationMode && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            Alert data may be stale or incomplete. This planner is based only on alerts currently displayed; verify current conditions and instructions with official sources.
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div><div className="text-xs font-semibold text-ink">Your checklist</div><div className="mt-0.5 text-[10px] text-ink-muted">{completedCount} of {checklist.length} complete</div></div>
          <button type="button" onClick={() => setCheckedIds([])} className="inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-soft hover:bg-slate-50"><RotateCcw size={12} aria-hidden /> Reset</button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Checklist completion" aria-valuemin={0} aria-valuemax={checklist.length} aria-valuenow={completedCount}>
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${checklist.length ? (completedCount / checklist.length) * 100 : 0}%` }} />
        </div>
        <ul className="space-y-2">
          {visibleChecklist.map((item) => {
            const checked = checkedIds.includes(item.id);
            return <li key={item.id}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line-soft p-3 text-sm hover:bg-slate-50">
                <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-blue-700" checked={checked} onChange={() => toggleChecked(item.id)} />
                <span className="min-w-0 flex-1"><span className={`block text-xs font-semibold ${checked ? 'text-ink-muted line-through' : 'text-ink'}`}>{item.title}</span><span className="mt-1 block text-xs leading-relaxed text-ink-soft">{item.detail}</span></span>
                {checked && <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden />}
              </label>
            </li>;
          })}
        </ul>
        {checklist.length > 5 && <button type="button" onClick={() => setShowAll((current) => !current)} className="w-full rounded-md border border-line px-3 py-2 text-xs font-medium text-ink-soft hover:bg-slate-50">{showAll ? 'Show fewer actions' : `Show all ${checklist.length} actions`}</button>}
        <p className="text-[10px] leading-relaxed text-ink-muted">General preparedness guidance only. Follow the instructions in the official alert and local emergency officials. AlertLens cannot guarantee safety, determine individual medical needs, or confirm shelter availability.</p>
      </div>
    </section>
  );
}
