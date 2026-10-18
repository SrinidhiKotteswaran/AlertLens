import { ShieldCheck, RefreshCw, Settings, Beaker, AlertTriangle, Info } from 'lucide-react';
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
  canDetermineImpact: boolean;
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
  canDetermineImpact,
}: HeaderProps) {
  const statusLabel = simulationMode
    ? 'Demo mode'
    : dataStatus.lastFetchError
      ? 'Could not update'
      : dataStatus.isStale
        ? 'May be out of date'
        : dataStatus.ok
          ? 'Checked'
          : 'Not checked yet';

  return (
    <header className="border-b border-line bg-[#FAFAF7] sticky top-0 z-[1000]">
      <div className="mx-auto max-w-layout px-4 sm:px-6">
        <div className="flex items-center gap-3 py-3">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="grid place-items-center h-9 w-9 rounded-md bg-brand-700 text-white">
              <ShieldCheck size={19} strokeWidth={1.8} aria-hidden />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-ink tracking-tight text-[17px]">AlertLens</div>
              <div className="text-[11px] text-ink-muted tracking-tight">Local conditions, clearly.</div>
            </div>
          </div>

          <div className="hidden md:flex flex-1 items-center gap-5 ml-3">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Your area</div>
              <div className="text-sm text-ink truncate" title={locationLabel ?? undefined}>
                {locationLabel ?? 'Choose a location'}
              </div>
            </div>
            <div className="hidden lg:block min-w-[130px]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Data check</div>
              <div className="flex items-center gap-1.5 text-sm">
                <StatusDot status={dataStatus} simulationMode={simulationMode} />
                <span className="text-ink-soft truncate">{statusLabel}</span>
              </div>
            </div>
            <div className="hidden xl:block min-w-[105px]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Active alerts</div>
              <div className="text-sm text-ink">{activeAlertCount}</div>
            </div>
            <div className="hidden xl:block min-w-[150px]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Location check</div>
              <div className="flex items-center gap-1.5 text-sm">
                {canDetermineImpact ? (
                  <>
                    <Info size={14} className="text-brand-600" aria-hidden />
                    <span className="text-ink-soft">Boundary available</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} className="text-amber-600" aria-hidden />
                    <span className="text-ink-soft">Not available yet</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <div className="hidden md:block text-[11px] text-ink-muted mr-2">
              {lastRefreshedAt ? 'Checked ' + formatRelative(lastRefreshedAt) : 'Not checked yet'}
            </div>
            <button type="button" onClick={onRefresh} disabled={simulationMode} className="btn btn-ghost" aria-label="Refresh data" title="Check for updated alerts">
              <RefreshCw size={15} aria-hidden />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onToggleSimulation}
              className={`btn ${simulationMode ? 'btn-primary' : 'btn-ghost'}`}
              aria-pressed={simulationMode}
              title="Open the Simulation Lab"
            >
              <Beaker size={15} aria-hidden />
              <span className="hidden sm:inline">Try a demo</span>
            </button>
            <button type="button" onClick={onOpenSettings} className="btn btn-ghost" aria-label="Settings" title="Settings">
              <Settings size={16} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatusDot({ status, simulationMode }: { status: DataStatus; simulationMode: boolean }) {
  let color = '#78847E';
  if (simulationMode) color = '#7A1212';
  else if (status.lastFetchError) color = '#B3261E';
  else if (status.isStale) color = '#A95C13';
  else if (status.ok) color = '#267052';
  return <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />;
}
