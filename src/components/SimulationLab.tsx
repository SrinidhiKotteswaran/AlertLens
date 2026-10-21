import { useState } from 'react';
import { Beaker, X, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import type { SimulationScenario, GeoPoint } from '@/types/domain';
import { SIMULATION_SCENARIOS } from '@/lib/simulation';
import { hazardColor } from '@/lib/explanations';

export interface SimulationLabProps {
  open: boolean;
  onClose: () => void;
  activeScenarioId: string | null;
  onSelectScenario: (scenario: SimulationScenario, point: GeoPoint) => void;
  onExitSimulation: () => void;
}

export function SimulationLab({
  open,
  onClose,
  activeScenarioId,
  onSelectScenario,
  onExitSimulation,
}: SimulationLabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="relative panel w-full max-w-3xl max-h-[88vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sim-title"
      >
        <div className="sticky top-0 bg-white border-b border-line px-5 py-3 flex items-center gap-2 z-10">
          <Beaker size={16} className="text-brand-500" aria-hidden />
          <h2 id="sim-title" className="text-sm font-semibold text-ink">
            Simulation Lab — demonstration mode
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto btn btn-ghost"
            aria-label="Close simulation lab"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Persistent SIMULATION warning */}
          <div className="rounded-md bg-red-50 border-2 border-red-300 px-4 py-3">
            <div className="flex items-center gap-2 text-red-800 font-semibold text-sm">
              <AlertTriangle size={16} aria-hidden />
              SIMULATION — NOT LIVE WEATHER
            </div>
            <p className="mt-1 text-xs text-red-700 leading-relaxed">
              The scenarios below use synthetic fixtures shaped like real NWS alerts. They are
              illustrative only. Geometry is invented for demonstration and is not from a live
              alert. Simulated records are never mixed with live data, never trigger emergency
              notifications, and never appear as an official current alert.
            </p>
          </div>

          <section className="rounded-lg border border-brand-100 bg-brand-50/60 p-4" aria-label="Recommended demonstration walkthrough">
            <h3 className="text-sm font-semibold text-brand-900">Recommended walkthrough</h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Run a scenario to load a clearly labeled synthetic alert and its demonstration location.',
                'Inspect the map boundary and selected-location marker.',
                'Read Safety Status, the alert summary, and the inside/outside/unknown boundary result.',
                'Review the action checklist and linked safety reference. Exit simulation to return to live NWS data.',
              ].map((step, index) => (
                <div key={step} className="flex items-start gap-2.5 rounded-md border border-brand-100 bg-white/80 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-900 tabular-nums">
                    {index + 1}
                  </span>
                  <p className="min-w-0 text-xs leading-relaxed text-brand-900">{step}</p>
                </div>
              ))}
            </div>
          </section>

          {activeScenarioId && (
            <div className="rounded-md bg-brand-50 border border-brand-100 px-3 py-2 text-xs text-brand-800 flex items-center gap-2">
              <CheckCircle2 size={14} aria-hidden />
              A simulation scenario is active.{' '}
              <button
                type="button"
                onClick={onExitSimulation}
                className="ml-1 underline hover:no-underline"
              >
                Exit simulation and return to live data
              </button>
            </div>
          )}

          <div className="space-y-3">
            {SIMULATION_SCENARIOS.map((s) => {
              const color = hazardColor(
                s.alert.properties.event.toLowerCase().includes('tornado')
                  ? 'tornado'
                  : s.alert.properties.event.toLowerCase().includes('flood')
                    ? 'flood'
                    : 'thunder',
              );
              const isActive = s.id === activeScenarioId;
              const isExpanded = expandedId === s.id;
              return (
                <div
                  key={s.id}
                  className={`rounded-md border transition-colors ${
                    isActive ? 'border-brand-300 bg-brand-50/40' : 'border-line bg-white'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1 inline-block h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink">{s.title}</div>
                        <p className="text-xs text-ink-soft mt-1 leading-relaxed">
                          {s.description}
                        </p>
                        <div className="mt-1.5 text-[11px] text-ink-muted">
                          Demo location: {s.locationLabel}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectScenario(s, s.location)}
                        className="btn btn-primary"
                      >
                        Run scenario <ArrowRight size={13} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : s.id)}
                        className="btn"
                      >
                        {isExpanded ? 'Hide walkthrough' : 'Show walkthrough'}
                      </button>
                    </div>

                    {isExpanded && (
                      <ol className="mt-3 list-decimal list-outside ml-5 text-xs text-ink-soft space-y-1.5 leading-relaxed border-l-2 border-line pl-3">
                        {s.walkthrough.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
