import { ShieldCheck, RefreshCw, Settings, Beaker } from 'lucide-react';
import type { DataStatus } from '@/types/domain';
import { formatRelative } from '@/lib/format';

export interface HeaderProps {
  locationLabel: string | null;
  dataStatus: DataStatus;
  activeAlertCount: number;
  simulationMode: boolean;
  lastRefreshedAt: Date | null;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onToggleSimulation: () => void;
}

export function Header({
  locationLabel,
  dataStatus,
  activeAlertCount,
  simulationMode,
  lastRefreshedAt,
  onRefresh,
  onOpenSettings,
  onToggleSimulation,
}: HeaderProps) {
  return (
    <header className="border-b border-line bg-white/90 backdrop-blur-sm sticky top-0 z-[1000]">
      <div className="mx-auto max-w-layout px-4 sm:px-6">
        <div className="flex items-center gap-3 py-3">
          {/* Wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="grid place-items-center h-9 w-9 rounded-md bg-brand-500 text-white">
              <ShieldCheck size={18} aria-hidden />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-ink tracking-tight">AlertLens</div>
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">
                Public Safety Weather
              </div>
            </div>
          </div>

          {/* Location + status (desktop) */}
          <div className="hidden md:flex flex-1 items-center gap-4 ml-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">Location</div>
              <div className="text-sm text-ink truncate" title={locationLabel ?? undefined}>
                {locationLabel ?? 'No location selected'}
              </div>
            </div>
            <div className="hidden lg:block min-w-[140px]">
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">Data status</div>
              <div className="flex items-center gap-1.5 text-sm">
                <StatusDot status={dataStatus} simulationMode={simulationMode} />
                <span className="text-ink-soft truncate">
                  {simulationMode
                    ? 'Simulation'
                    : dataStatus.coverageWarning
                      ? 'Partial'
                      : dataStatus.isStale
                        ? 'Stale'
                        : dataStatus.lastFetchError
                          ? 'Error'
                          : dataStatus.ok
                            ? 'Live'
                            : 'Idle'}
                </span>
              </div>
            </div>
            <div className="hidden xl:block min-w-[120px]">
              <div className="text-[10px] uppercase tracking-wide text-ink-muted">Active alerts</div>
              <div className="text-sm text-ink">{activeAlertCount}</div>
            </div>

          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="hidden md:block text-[11px] text-ink-muted mr-1">
              {lastRefreshedAt ? `Updated ${formatRelative(lastRefreshedAt)}` : 'Not yet updated'}
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={simulationMode}
              className="btn btn-ghost"
              aria-label="Refresh data"
              title="Refresh data"
            >
              <RefreshCw size={16} aria-hidden />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onToggleSimulation}
              className={`btn ${simulationMode ? 'btn-primary' : 'btn-ghost'}`}
              aria-pressed={simulationMode}
              title="Open the Simulation Lab"
            >
              <Beaker size={16} aria-hidden />
              <span className="hidden sm:inline">Simulation Lab</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="btn btn-ghost"
              aria-label="Settings"
              title="Settings"
            >
              <Settings size={16} aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-line-soft py-2 text-xs md:hidden" role="status" aria-live="polite">
          <div className="min-w-0 flex-1 truncate text-ink-soft">{locationLabel ?? 'No location selected'}</div>
          <div className="flex shrink-0 items-center gap-1.5 font-medium text-ink-soft">
            <StatusDot status={dataStatus} simulationMode={simulationMode} />
            {simulationMode ? 'Simulation' : dataStatus.coverageWarning ? 'Partial data' : dataStatus.isStale ? 'Stale data' : dataStatus.lastFetchError ? 'Data error' : dataStatus.ok ? 'Live data' : 'Checking'}
          </div>
          <span className="shrink-0 text-ink-muted">{activeAlertCount} alert{activeAlertCount === 1 ? '' : 's'}</span>
        </div>
      </div>
    </header>
  );
}

function StatusDot({
  status,
  simulationMode,
}: {
  status: DataStatus;
  simulationMode: boolean;
}) {
  let color = '#6B7280';
  if (simulationMode) color = '#7A1212';
  else if (status.coverageWarning || status.isStale) color = '#C4661F';
  else if (status.lastFetchError) color = '#B3261E';
  else if (status.ok) color = '#2A8C4A';
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}
