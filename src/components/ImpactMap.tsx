import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  useMap,
  Popup,
  Tooltip,
  ZoomControl,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NormalizedAlert, GeoPoint, ImpactState } from '@/types/domain';
import { toGeoJSONGeometry, geometryBounds } from '@/lib/geometry';
import { hazardColor } from '@/lib/explanations';
import { Plus } from 'lucide-react';

export const COMMUNITY_HAZARDS = [
  { value: 'Flooding (Street / Stream)', color: '#3B82F6', icon: '🌊' },
  { value: 'Flash Flooding (Rapid Rise / Evacuation)', color: '#1D4ED8', icon: '💧' },
  { value: 'Downed Tree / Blocked Road', color: '#F97316', icon: '🌲' },
  { value: 'Power Outage / Downed Utility Lines', color: '#EAB308', icon: '⚡' },
  { value: 'Structural Property Damage', color: '#EF4444', icon: '🏚️' },
  { value: 'Hail Sighting', color: '#A855F7', icon: '🧊' },
  { value: 'Funnel Cloud / Tornado Sighting', color: '#581C87', icon: '🌪️' },
  { value: 'Heavy Snow / Unplowed Drifts', color: '#64748B', icon: '❄️' },
  { value: 'Ice Accumulation / Freezing Rain', color: '#06B6D4', icon: '🧊' },
  { value: 'High Wind / Wind Damage', color: '#D97706', icon: '💨' },
  { value: 'Lightning / Thunderstorm Damage', color: '#7C3AED', icon: '⛈️' },
  { value: 'Smoke / Poor Air Quality', color: '#6B7280', icon: '🌫️' },
  { value: 'Landslide / Sinkhole', color: '#92400E', icon: '⛰️' },
  { value: 'Coastal / High Surf Hazard', color: '#0891B2', icon: '🌊' },
  { value: 'Other Safety Hazard', color: '#4B5563', icon: '📍' },
] as const;

export type CommunityHazard = typeof COMMUNITY_HAZARDS[number]['value'];
export interface CommunityReport {
  id: string;
  point: GeoPoint;
  category: CommunityHazard;
  customHazard?: string;
  details: string;
  createdAt: string;
}
export interface CommunityDraft {
  point: GeoPoint;
  category: CommunityHazard;
  customHazard: string;
  details: string;
}

function markerIcon(color: string, icon: string, selected = false): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="display:grid;place-items:center;width:32px;height:32px;border:2px solid white;border-radius:50%;background:${color};box-shadow:0 2px 8px #152b3b55;font-size:16px;${selected ? 'outline:3px solid #16324f;' : ''}">${icon}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function makeSelectedIcon(): L.DivIcon {
  return L.divIcon({ className: 'alertlens-marker', iconSize: [16, 16], iconAnchor: [8, 8] });
}

interface FitBoundsProps {
  bounds: [[number, number], [number, number]] | null;
  trigger: unknown;
}
function FitBounds({ bounds, trigger }: FitBoundsProps) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    const leafletBounds = L.latLngBounds([bounds[0][1], bounds[0][0]], [bounds[1][1], bounds[1][0]]);
    map.fitBounds(leafletBounds, { padding: [40, 40], maxZoom: 12 });
  }, [map, bounds, trigger]);
  return null;
}
function Recenter({ point }: { point: GeoPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView([point.lat, point.lng], Math.max(map.getZoom(), 9));
  }, [map, point]);
  return null;
}

function MapReportClickHandler({ active, onPlace }: { active: boolean; onPlace: (point: GeoPoint) => void }) {
  useMapEvents({
    click(event) {
      if (active) onPlace({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

export interface ImpactMapProps {
  point: GeoPoint | null;
  alerts: NormalizedAlert[];
  selectedAlertId: string | null;
  onSelectAlert: (id: string | null) => void;
  fitAlertId: string | null;
  reports: CommunityReport[];
  onAddReport: (report: CommunityReport) => void;
  reportRequestId: number;
  placeReportRequestId: number;
}
export function ImpactMap({ point, alerts, selectedAlertId, onSelectAlert, fitAlertId, reports, onAddReport, reportRequestId, placeReportRequestId }: ImpactMapProps) {
  const selectedIcon = useMemo(() => makeSelectedIcon(), []);
  const [draft, setDraft] = useState<CommunityDraft | null>(null);
  const [formError, setFormError] = useState('');
  const [placingReport, setPlacingReport] = useState(false);
  const draftMarkerRef = useRef<L.Marker | null>(null);
  const polygonsWithGeom = useMemo(
    () => alerts.filter((a) => a.geometry !== null) as (NormalizedAlert & { geometry: NonNullable<NormalizedAlert['geometry']> })[],
    [alerts],
  );
  const fitBoundsTarget = useMemo(() => {
    if (!fitAlertId) return null;
    const alert = polygonsWithGeom.find((item) => item.id === fitAlertId);
    return alert ? geometryBounds(alert.geometry) : null;
  }, [fitAlertId, polygonsWithGeom]);
  useEffect(() => { if (draft) draftMarkerRef.current?.openPopup(); }, [draft]);
  useEffect(() => {
    if (reportRequestId === 0 || !point) return;
    setDraft({ point: { ...point }, category: COMMUNITY_HAZARDS[0].value, customHazard: '', details: '' });
    setFormError('');
  }, [reportRequestId]);

  useEffect(() => {
    if (placeReportRequestId > 0) {
      setPlacingReport(true);
      setDraft(null);
      setFormError('');
    }
  }, [placeReportRequestId]);

  function handleMapReportPoint(reportPoint: GeoPoint) {
    setDraft({ point: reportPoint, category: COMMUNITY_HAZARDS[0].value, customHazard: '', details: '' });
    setFormError('');
    setPlacingReport(false);
  }

  const initialCenter: [number, number] = point ? [point.lat, point.lng] : [39.4496, -75.7163];
  const initialZoom = point ? 9 : 10;

  function submitReport(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    if (!draft.details.trim()) { setFormError('Add a short description of what you observed.'); return; }
    if (draft.category === 'Other Safety Hazard' && !draft.customHazard.trim()) {
      setFormError('Specify the type of hazard so other people know what was reported.'); return;
    }
    const report: CommunityReport = {
      id: `community-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      point: draft.point,
      category: draft.category,
      customHazard: draft.category === 'Other Safety Hazard' ? draft.customHazard.trim() : undefined,
      details: draft.details.trim(),
      createdAt: new Date().toISOString(),
    };
    onAddReport(report);
    setDraft(null);
    setFormError('');
  }

  return (
    <MapContainer center={initialCenter} zoom={initialZoom} scrollWheelZoom zoomControl={false} className="h-full w-full" attributionControl>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />
      <Recenter point={point} />
      <FitBounds bounds={fitBoundsTarget} trigger={fitAlertId} />
      <MapReportClickHandler active={placingReport} onPlace={handleMapReportPoint} />

      {point && <Marker position={[point.lat, point.lng]} icon={selectedIcon} bubblingMouseEvents={false}><Popup><div className="text-xs"><div className="font-semibold">Selected location</div><div>{point.lat.toFixed(4)}, {point.lng.toFixed(4)}</div></div></Popup></Marker>}
      {placingReport && <div className="absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 items-center gap-3 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-semibold text-white shadow-lg"><span>Click the map to place your report pin</span><button type="button" onClick={() => setPlacingReport(false)} className="rounded-full bg-white/15 px-2 py-1 hover:bg-white/25">Cancel</button></div>}

      {polygonsWithGeom.map((alert) => {
        const geometry = toGeoJSONGeometry(alert.geometry);
        const isSelected = alert.id === selectedAlertId;
        const color = hazardColor(alert.hazardCategory);
        return <Polygon key={alert.id} bubblingMouseEvents={false} positions={leafletPositionsFor(geometry)} pathOptions={{ color, weight: isSelected ? 3 : 1.75, opacity: isSelected ? 1 : 0.85, fillColor: color, fillOpacity: isSelected ? 0.22 : 0.14, dashArray: isSelected ? undefined : '4 3' }} eventHandlers={{ click: () => onSelectAlert(isSelected ? null : alert.id) }}>
          <Popup><div className="text-xs max-w-[220px]"><div className="font-semibold">{alert.event}</div><div className="mt-0.5">{alert.areaDesc}</div><div className="mt-1 text-[10px]">{isSelected ? 'Selected alert' : 'Click to select'}</div></div></Popup>
        </Polygon>;
      })}

      {reports.map((report) => {
        const hazard = COMMUNITY_HAZARDS.find((item) => item.value === report.category) ?? COMMUNITY_HAZARDS[COMMUNITY_HAZARDS.length - 1];
        return <Marker key={report.id} position={[report.point.lat, report.point.lng]} icon={markerIcon(hazard.color, hazard.icon)} bubblingMouseEvents={false}>
          <Tooltip direction="top" offset={[0, -14]} opacity={1}>
            <div className="max-w-[220px] text-xs"><div className="font-semibold">{report.customHazard || report.category}</div><p className="mt-1 whitespace-normal">{report.details}</p><div className="mt-1 text-[10px] text-amber-700">Community report · Unverified</div></div>
          </Tooltip>
          <Popup><div className="max-w-[230px] text-xs"><div className="font-semibold">{report.customHazard || report.category}</div><p className="mt-1">{report.details}</p><div className="mt-2 text-[10px] text-slate-500">Community-submitted · {new Date(report.createdAt).toLocaleString()}</div><div className="mt-1 text-[10px] text-amber-700">Unverified community report</div></div></Popup>
        </Marker>;
      })}

      {draft && <Marker position={[draft.point.lat, draft.point.lng]} ref={draftMarkerRef} icon={markerIcon('#2563EB', '＋', true)} bubblingMouseEvents={false}>
        <Popup closeButton={false} minWidth={260} maxWidth={300}>
          <form onSubmit={submitReport} className="space-y-2 text-xs">
            <div className="font-semibold text-sm">Report a local condition</div>
            <p className="text-slate-600">Report location: {draft.point.lat.toFixed(4)}, {draft.point.lng.toFixed(4)}. Reports are unverified, saved in this browser, and expire after 24 hours.</p>
            <label className="block font-medium">What are you seeing?
              <select className="mt-1 w-full rounded border border-slate-300 p-2" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as CommunityHazard })}>
                {COMMUNITY_HAZARDS.map((hazard) => <option key={hazard.value} value={hazard.value}>{hazard.value}</option>)}
              </select>
            </label>
            {draft.category === 'Other Safety Hazard' && <label className="block font-medium">Specify hazard type
              <input className="mt-1 w-full rounded border border-slate-300 p-2" value={draft.customHazard} onChange={(e) => setDraft({ ...draft, customHazard: e.target.value })} placeholder="e.g., landslide, dense smoke, high surf" maxLength={70} />
            </label>}
            <label className="block font-medium">Details
              <textarea className="mt-1 w-full rounded border border-slate-300 p-2" value={draft.details} onChange={(e) => setDraft({ ...draft, details: e.target.value })} placeholder="Describe what you observed..." rows={3} maxLength={280} />
            </label>
            {formError && <p role="alert" className="text-red-700">{formError}</p>}
            <div className="flex gap-2"><button className="rounded bg-blue-700 px-3 py-2 font-semibold text-white" type="submit"><Plus size={12} className="inline mr-1" />Post report</button><button className="rounded border px-3 py-2" type="button" onClick={() => setDraft(null)}>Cancel</button></div>
          </form>
        </Popup>
      </Marker>}
    </MapContainer>
  );
}

type LeafletPos = [number, number];
type LeafletRing = LeafletPos[];
type LeafletPoly = LeafletRing[];
type LeafletMulti = LeafletPoly[];
function leafletPositionsFor(g: ReturnType<typeof toGeoJSONGeometry>): LeafletPoly | LeafletMulti {
  if (g.type === 'Polygon') return g.coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng] as LeafletPos));
  return g.coordinates.map((poly) => poly.map((ring) => ring.map(([lng, lat]) => [lat, lng] as LeafletPos)));
}
export function mapLegendItems(alerts: NormalizedAlert[], _impactStates: Record<string, ImpactState>): { color: string; label: string; count: number }[] {
  const groups = new Map<string, { color: string; label: string; count: number }>();
  for (const alert of alerts) {
    const color = hazardColor(alert.hazardCategory);
    const key = `${color}|${alert.event}`;
    const existing = groups.get(key);
    if (existing) existing.count += 1;
    else groups.set(key, { color, label: alert.event, count: 1 });
  }
  return [{ color: '#377DB5', label: 'Selected location', count: 1 }, ...Array.from(groups.values())];
}
