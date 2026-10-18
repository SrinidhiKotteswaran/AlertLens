import { X, Settings, Info } from 'lucide-react';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  refreshIntervalMs: number;
  onChangeRefreshInterval: (ms: number) => void;
  attribution: string[];
}

const INTERVALS = [
  { label: 'Off (manual only)', value: 0 },
  { label: '60 seconds', value: 60_000 },
  { label: '2 minutes', value: 120_000 },
  { label: '5 minutes', value: 300_000 },
];

export function SettingsModal({
  open,
  onClose,
  refreshIntervalMs,
  onChangeRefreshInterval,
  attribution,
}: SettingsModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="relative panel w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="panel-header">
          <Settings size={15} className="text-brand-500" aria-hidden />
          <h2 id="settings-title" className="text-sm font-semibold text-ink">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto btn btn-ghost"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="field-label mb-1.5">Auto-refresh interval</div>
            <p className="text-xs text-ink-muted mb-2">
              AlertLens respects NWS rate guidance. Manual refresh is always available.
            </p>
            <div className="flex flex-wrap gap-2">
              {INTERVALS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChangeRefreshInterval(opt.value)}
                  className={`btn ${
                    refreshIntervalMs === opt.value ? 'btn-primary' : ''
                  }`}
                  aria-pressed={refreshIntervalMs === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-line-soft pt-4">
            <div className="field-label flex items-center gap-1.5 mb-1.5">
              <Info size={12} aria-hidden /> About AlertLens
            </div>
            <p className="text-xs text-ink-soft leading-relaxed">
              AlertLens is an independent civic-information project that visualizes official U.S.
              National Weather Service alerts against a selected location. It is not affiliated
              with, endorsed by, or impersonating the NWS or any government agency. Always follow
              instructions from local officials during an emergency.
            </p>
            <ul className="mt-2 text-[11px] text-ink-muted space-y-0.5">
              {attribution.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
