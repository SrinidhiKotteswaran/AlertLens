import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import type { GeoPoint } from '@/types/domain';

interface Props { point: GeoPoint | null; simulationMode: boolean }
interface ProductSummary { '@id'?: string; id?: string; issuanceTime?: string; productName?: string }
interface ProductList { '@graph'?: ProductSummary[] }
interface PointResponse { properties?: { gridId?: string } }
interface Product { productText?: string; issuanceTime?: string; productName?: string }

const BASE = 'https://api.weather.gov';
const headers = { Accept: 'application/geo+json, application/ld+json;q=0.9' };

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { headers, signal });
  if (!response.ok) throw new Error(`NWS request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export function HazardousWeatherOutlook({ point, simulationMode }: Props) {
  const [outlook, setOutlook] = useState<{ office: string; url: string; issuedAt: string | null; title: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const latitude = point?.lat;
  const longitude = point?.lng;

  useEffect(() => {
    if (latitude == null || longitude == null || simulationMode) { setOutlook(null); setLoading(false); setExpanded(false); return; }
    const controller = new AbortController();
    setOutlook(null);
    setLoading(true);
    const load = async () => {
      try {
        const pointData = await getJson<PointResponse>(`${BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`, controller.signal);
        const office = pointData.properties?.gridId?.toUpperCase();
        if (!office) throw new Error('Forecast office unavailable');
        const list = await getJson<ProductList>(`${BASE}/products/types/HWO/locations/${encodeURIComponent(office)}`, controller.signal);
        const latest = (list['@graph'] ?? [])
          .filter((item) => item['@id'] || item.id)
          .sort((a, b) => Date.parse(b.issuanceTime ?? '') - Date.parse(a.issuanceTime ?? ''))[0];
        const url = latest?.['@id'] ?? latest?.id;
        if (!url) throw new Error('No current outlook product');
        const product = await getJson<Product>(url, controller.signal);
        if (!product.productText?.trim()) throw new Error('Outlook text unavailable');
        if (!controller.signal.aborted) setOutlook({
          office, url, issuedAt: product.issuanceTime ?? latest.issuanceTime ?? null,
          title: product.productName ?? latest.productName ?? 'Hazardous Weather Outlook',
          text: product.productText.trim(),
        });
      } catch {
        if (!controller.signal.aborted) setOutlook(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [latitude, longitude, simulationMode]);

  if (simulationMode) return null;
  const issued = outlook?.issuedAt ? new Date(outlook.issuedAt) : null;
  const issuedLabel = issued && !Number.isNaN(issued.getTime())
    ? issued.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <section className="panel mb-3 overflow-hidden" aria-label="NWS Hazardous Weather Outlook">
      <div className="flex items-start gap-3 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-800"><AlertTriangle size={17} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">NWS Hazardous Weather Outlook</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">Regional guidance about hazards that could develop. This is not an active warning and may cover a wider area than the selected location.</p>
          {outlook && <p className="mt-1 text-[11px] text-ink-muted">Issuing office: {outlook.office}{issuedLabel ? ` · Issued ${issuedLabel}` : ''}</p>}
          {loading && <p className="mt-2 flex items-center gap-2 text-xs text-ink-muted" role="status"><Loader2 size={13} className="animate-spin" /> Checking the latest regional bulletin…</p>}
          {!loading && !outlook && <p className="mt-2 text-xs text-ink-soft">The latest regional bulletin is unavailable here right now. Check official NWS information directly.</p>}
        </div>
        {outlook && <a href={outlook.url} target="_blank" rel="noreferrer noopener" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">NWS source <ExternalLink size={12} /></a>}
      </div>
      {outlook && <div className="border-t border-line-soft">
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs font-semibold text-brand-800 hover:bg-brand-50/50">
          {expanded ? 'Hide full regional bulletin' : 'Read full regional bulletin'}<span aria-hidden="true">{expanded ? '−' : '+'}</span>
        </button>
        {expanded && <div className="max-h-96 overflow-y-auto border-t border-line-soft p-3">
          <p className="mb-2 text-xs font-semibold text-ink">{outlook.title}</p>
          <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-ink-soft">{outlook.text}</pre>
        </div>}
      </div>}
    </section>
  );
}
