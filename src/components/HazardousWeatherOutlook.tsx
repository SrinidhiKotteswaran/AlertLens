import { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import type { GeoPoint } from '@/types/domain';

interface Props { point: GeoPoint | null; simulationMode: boolean }
interface ProductSummary { '@id'?: string; id?: string; issuanceTime?: string; productName?: string }
interface ProductList { '@graph'?: ProductSummary[] }
interface PointResponse {
  properties?: {
    gridId?: string;
    relativeLocation?: { properties?: { state?: string } };
  };
}
interface Product { productText?: string; issuanceTime?: string; productName?: string }

const BASE = 'https://api.weather.gov';
const headers = { Accept: 'application/geo+json, application/ld+json;q=0.9' };
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { headers, signal });
  if (!response.ok) throw new Error(`NWS request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

function getDeclaredRegion(text: string): string | null {
  const match = text.match(/This Hazardous Weather Outlook is for\s+([^.\n]+)\./i);
  return match?.[1]?.trim() ?? null;
}

function isRelevantToState(region: string | null, stateCode: string | undefined): boolean {
  if (!region || !stateCode) return true;
  const normalizedRegion = region.toLocaleLowerCase();
  const mentionedStates = Object.entries(STATE_NAMES)
    .filter(([, name]) => normalizedRegion.includes(name.toLocaleLowerCase()))
    .map(([code]) => code);
  // Suppress only when the bulletin explicitly names other state(s).
  return mentionedStates.length === 0 || mentionedStates.includes(stateCode.toUpperCase());
}

function extractHazardStatements(text: string): string[] {
  const matches = [...text.matchAll(/\b([A-Z][A-Z -]{2,55}?(?:ADVISORY|WARNING|WATCH|STATEMENT))\s+(?:IS\s+)?IN EFFECT\s+(?:UNTIL|THROUGH|FROM|FOR)\s+[^\n.]{1,100}/gi)];
  return [...new Set(matches.map((match) => match[0].replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 3);
}

function getReadableDetails(text: string): string {
  const dayOne = text.search(/\.DAY ONE\.\.\./i);
  const dayTwo = text.search(/\.DAYS? TWO(?: THROUGH SEVEN)?\.\.\./i);
  const start = dayOne >= 0 ? dayOne : Math.max(0, text.search(/This Hazardous Weather Outlook is for/i));
  const end = dayTwo > start ? dayTwo : Math.min(text.length, start + 900);
  return text.slice(start, end).replace(/\s+/g, ' ').trim().slice(0, 900);
}

export function HazardousWeatherOutlook({ point, simulationMode }: Props) {
  const [outlook, setOutlook] = useState<{
    office: string; url: string; issuedAt: string | null; region: string | null;
    hazards: string[]; details: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [notRelevant, setNotRelevant] = useState(false);

  const latitude = point?.lat;
  const longitude = point?.lng;

  useEffect(() => {
    if (latitude == null || longitude == null || simulationMode) {
      setOutlook(null); setLoading(false); setExpanded(false); setNotRelevant(false); return;
    }
    const controller = new AbortController();
    setOutlook(null); setLoading(true); setNotRelevant(false); setExpanded(false);
    const load = async () => {
      try {
        const pointData = await getJson<PointResponse>(`${BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`, controller.signal);
        const office = pointData.properties?.gridId?.toUpperCase();
        const stateCode = pointData.properties?.relativeLocation?.properties?.state;
        if (!office) throw new Error('Forecast office unavailable');
        const list = await getJson<ProductList>(`${BASE}/products/types/HWO/locations/${encodeURIComponent(office)}`, controller.signal);
        const latest = (list['@graph'] ?? [])
          .filter((item) => item['@id'] || item.id)
          .sort((a, b) => Date.parse(b.issuanceTime ?? '') - Date.parse(a.issuanceTime ?? ''))[0];
        const url = latest?.['@id'] ?? latest?.id;
        if (!url) throw new Error('No current outlook product');
        const product = await getJson<Product>(url, controller.signal);
        const text = product.productText?.trim();
        if (!text) throw new Error('Outlook text unavailable');
        const region = getDeclaredRegion(text);
        if (!isRelevantToState(region, stateCode)) {
          if (!controller.signal.aborted) setNotRelevant(true);
          return;
        }
        if (!controller.signal.aborted) setOutlook({
          office, url, issuedAt: product.issuanceTime ?? latest.issuanceTime ?? null,
          region, hazards: extractHazardStatements(text), details: getReadableDetails(text),
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

  if (simulationMode || loading || notRelevant || !outlook || outlook.hazards.length === 0) return null;
  const issued = outlook?.issuedAt ? new Date(outlook.issuedAt) : null;
  const issuedLabel = issued && !Number.isNaN(issued.getTime())
    ? issued.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <section className="panel mb-3 overflow-hidden" aria-label="Regional weather outlook">
      <div className="flex items-start gap-3 p-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-800"><AlertTriangle size={17} aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">Regional weather outlook</h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">Broader-area NWS guidance—not an active warning for your exact location.</p>
          {outlook.region && <p className="mt-1 text-xs text-ink-soft">Coverage: {outlook.region}</p>}
          <p className="mt-1 text-[11px] text-ink-muted">Updated {issuedLabel ?? 'by the National Weather Service'}</p>
          <ul className="mt-2 space-y-1.5">{outlook.hazards.map((hazard) => <li key={hazard} className="rounded-lg bg-amber-50/70 px-2.5 py-2 text-xs leading-relaxed text-ink"><span className="font-semibold">{hazard}</span></li>)}</ul>
        </div>
        <a href={outlook.url} target="_blank" rel="noreferrer noopener" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">Official bulletin <ExternalLink size={12} /></a>
      </div>
      <div className="border-t border-line-soft">
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs font-semibold text-brand-800 hover:bg-brand-50/50">
          {expanded ? 'Hide bulletin details' : 'View readable bulletin details'}<span aria-hidden="true">{expanded ? '−' : '+'}</span>
        </button>
        {expanded && <div className="border-t border-line-soft p-3"><p className="text-xs leading-relaxed text-ink-soft">{outlook.details}</p></div>}
      </div>
    </section>
  );
}
