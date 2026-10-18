import { MapPin, Navigation, CircleHelp, Info, ShieldQuestion } from 'lucide-react';
import type { ImpactState, NormalizedAlert, GeoPoint } from '@/types/domain';
import { computeImpact } from '@/lib/geometry';

export interface LocalStatusPanelProps {
  point: GeoPoint | null;
  alerts: NormalizedAlert[];
  selectedAlertId: string | null;
}

export function LocalStatusPanel({ point, alerts, selectedAlertId }: LocalStatusPanelProps) {
  const selected = alerts.find((a) => a.id === selectedAlertId) ?? null;
  const impact = computeImpact(point, selected?.geometry ?? null);

  return (
    <section className="panel" aria-label="Local impact status">
      <div className="panel-header">
        <Navigation size={15} className="text-brand-500" aria-hidden />
        <h2 className="text-sm font-semibold text-ink">Local Impact Status</h2>
      </div>
      <div className="p-5">
        <ImpactBadge state={impact.state} />

        <div className="mt-4 space-y-3 text-sm">
          <Row label="Selected location">
            {point ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} className="text-brand-500" aria-hidden />
                {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
              </span>
            ) : (
              <span className="text-ink-muted">No location selected</span>
            )}
          </Row>
          <Row label="Selected alert">
            {selected ? (
              <span className="text-ink">{selected.event}</span>
            ) : (
              <span className="text-ink-muted">No alert selected</span>
            )}
          </Row>
          <Row label="Boundary geometry">
            {selected ? (
              selected.hasGeometry ? (
                <span className="text-ink">Supplied &amp; validated</span>
              ) : (
                <span className="text-amber-700">Not supplied</span>
              )
            ) : (
              <span className="text-ink-muted">—</span>
            )}
          </Row>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-soft bg-brand-50/60 border border-brand-100 rounded-md p-3">
          {impact.reason}
        </p>

        {impact.state === 'outside' && (
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            <ShieldQuestion size={12} className="inline -mt-0.5 mr-1 text-ink-muted" aria-hidden />
            Being outside a supplied boundary does not guarantee safety. Hazards can occur nearby or
            outside the drawn area.
          </p>
        )}
      </div>
    </section>
  );
}

function ImpactBadge({ state }: { state: ImpactState }) {
  if (state === 'inside') {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3" role="status">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center h-6 w-6 rounded-full bg-red-600 text-white text-xs font-semibold">
            !
          </span>
          <div>
            <div className="text-sm font-semibold text-red-800">INSIDE SUPPLIED BOUNDARY</div>
            <div className="text-xs text-red-700">
              Your selected location lies inside the validated alert area.
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (state === 'outside') {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3" role="status">
        <div className="flex items-center gap-2">
          <CircleHelp size={20} className="text-amber-600" aria-hidden />
          <div>
            <div className="text-sm font-semibold text-amber-800">OUTSIDE SUPPLIED BOUNDARY</div>
            <div className="text-xs text-amber-700">
              Your selected location lies outside the validated alert area.
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-md border border-line bg-canvas px-4 py-3" role="status">
      <div className="flex items-center gap-2">
        <Info size={20} className="text-ink-muted" aria-hidden />
        <div>
          <div className="text-sm font-semibold text-ink">LOCATION IMPACT UNKNOWN</div>
          <div className="text-xs text-ink-soft">
            AlertLens cannot determine point-level impact for this alert.
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="field-label">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
