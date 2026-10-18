import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polygon,
  useMap,
  Popup,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { NormalizedAlert, GeoPoint, ImpactState } from '@/types/domain';
import { toGeoJSONGeometry, geometryBounds } from '@/lib/geometry';
import { hazardColor } from '@/lib/explanations';

// Fix default marker icon path issues in Vite/webpack — use a custom div icon instead.
function makeSelectedIcon(): L.DivIcon {
  return L.divIcon({
    className: 'alertlens-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

interface FitBoundsProps {
  bounds: [[number, number], [number, number]] | null;
  /** When this value changes, fit the map to bounds. */
  trigger: unknown;
}

function FitBounds({ bounds, trigger }: FitBoundsProps) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    // Leaflet bounds are [lat, lng]; our bounds are [lng, lat].
    const leafletBounds = L.latLngBounds(
      [bounds[0][1], bounds[0][0]],
      [bounds[1][1], bounds[1][0]],
    );
    map.fitBounds(leafletBounds, { padding: [40, 40], maxZoom: 12 });
  }, [map, bounds, trigger]);
  return null;
}

interface RecenterProps {
  point: GeoPoint | null;
}

function Recenter({ point }: RecenterProps) {
  const map = useMap();
  useEffect(() => {
    if (!point) return;
    map.setView([point.lat, point.lng], map.getZoom() || 9);
  }, [map, point]);
  return null;
}

export interface ImpactMapProps {
  point: GeoPoint | null;
  alerts: NormalizedAlert[];
  selectedAlertId: string | null;
  onSelectAlert: (id: string | null) => void;
  /** When provided, fit the map to this alert's bounds. */
  fitAlertId: string | null;
}

export function ImpactMap({
  point,
  alerts,
  selectedAlertId,
  onSelectAlert,
  fitAlertId,
}: ImpactMapProps) {
  const selectedIcon = useMemo(() => makeSelectedIcon(), []);

  const polygonsWithGeom = useMemo(
    () => alerts.filter((a) => a.geometry !== null) as (NormalizedAlert & {
      geometry: NonNullable<NormalizedAlert['geometry']>;
    })[],
    [alerts],
  );

  const fitBoundsTarget = useMemo(() => {
    if (!fitAlertId) return null;
    const a = polygonsWithGeom.find((x) => x.id === fitAlertId);
    if (!a) return null;
    return geometryBounds(a.geometry);
  }, [fitAlertId, polygonsWithGeom]);

  const initialCenter: [number, number] = point
    ? [point.lat, point.lng]
    : [39.5, -98.35];
  const initialZoom = point ? 9 : 4;

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />
      <Recenter point={point} />
      <FitBounds bounds={fitBoundsTarget} trigger={fitAlertId} />

      {point && (
        <Marker position={[point.lat, point.lng]} icon={selectedIcon}>
          <Popup>
            <div className="text-xs">
              <div className="font-semibold text-ink">Selected location</div>
              <div className="text-ink-soft">
                {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
              </div>
            </div>
          </Popup>
        </Marker>
      )}

      {polygonsWithGeom.map((a) => {
        const gj = toGeoJSONGeometry(a.geometry);
        const isSelected = a.id === selectedAlertId;
        const color = hazardColor(a.hazardCategory);
        // Leaflet expects [lat, lng] for polygon paths.
        const positions = leafletPositionsFor(gj);
        return (
          <Polygon
            key={a.id}
            positions={positions}
            pathOptions={{
              color,
              weight: isSelected ? 3 : 1.75,
              opacity: isSelected ? 1 : 0.85,
              fillColor: color,
              fillOpacity: isSelected ? 0.22 : 0.14,
              dashArray: isSelected ? undefined : '4 3',
            }}
            eventHandlers={{
              click: () => onSelectAlert(isSelected ? null : a.id),
            }}
          >
            <Popup>
              <div className="text-xs max-w-[220px]">
                <div className="font-semibold text-ink">{a.event}</div>
                <div className="text-ink-soft mt-0.5">{a.areaDesc}</div>
                <div className="mt-1">
                  <span className="inline-block px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 text-[10px]">
                    {isSelected ? 'Selected' : 'Click to select'}
                  </span>
                </div>
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </MapContainer>
  );
}

type LeafletPos = [number, number];
type LeafletRing = LeafletPos[];
type LeafletPoly = LeafletRing[];
type LeafletMulti = LeafletPoly[];

function leafletPositionsFor(g: ReturnType<typeof toGeoJSONGeometry>): LeafletPoly | LeafletMulti {
  if (g.type === 'Polygon') {
    return g.coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng] as LeafletPos));
  }
  return g.coordinates.map((poly) =>
    poly.map((ring) => ring.map(([lng, lat]) => [lat, lng] as LeafletPos)),
  );
}

/** Build a legend entry list for display next to the map. */
export function mapLegendItems(
  alerts: NormalizedAlert[],
  impactStates: Record<string, ImpactState>,
): { color: string; label: string; count: number }[] {
  const groups = new Map<string, { color: string; label: string; count: number }>();
  for (const a of alerts) {
    const color = hazardColor(a.hazardCategory);
    const label = `${a.event}`;
    const key = `${color}|${label}`;
    const existing = groups.get(key);
    if (existing) existing.count += 1;
    else groups.set(key, { color, label, count: 1 });
  }
  // selected point entry
  return [
    { color: '#377DB5', label: 'Selected location', count: 1 },
    ...Array.from(groups.values()),
  ];
}
