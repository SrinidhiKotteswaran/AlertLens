import { useEffect, useState } from 'react';
import { CloudSun, ExternalLink, Loader2 } from 'lucide-react';
import type { GeoPoint } from '@/types/domain';

interface ForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  temperature: number;
  temperatureUnit: string;
  shortForecast: string;
  detailedForecast?: string;
  windSpeed?: string;
  windDirection?: string;
  probabilityOfPrecipitation?: { value: number | null };
}

interface ForecastResponse {
  properties?: { periods?: ForecastPeriod[] };
}

interface PointsResponse {
  properties?: { forecast?: string };
}

interface LocalForecastOutlookProps {
  point: GeoPoint | null;
  simulationMode: boolean;
}

export function LocalForecastOutlook({ point, simulationMode }: LocalForecastOutlookProps) {
  const latitude = point?.lat;
  const longitude = point?.lng;
  const [periods, setPeriods] = useState<ForecastPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (latitude == null || longitude == null || simulationMode) {
      setPeriods([]);
      setLoading(false);
      setError(false);
      return;
    }

    const lat = latitude;
    const lng = longitude;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    setPeriods([]);

    async function loadForecast() {
      try {
        const coordinates = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        const pointResponse = await fetch(`https://api.weather.gov/points/${coordinates}`, {
          headers: { Accept: 'application/geo+json' },
          signal: controller.signal,
        });
        if (!pointResponse.ok) throw new Error('Point forecast unavailable');
        const pointData = await pointResponse.json() as PointsResponse;
        const forecastUrl = pointData.properties?.forecast;
        if (!forecastUrl) throw new Error('No point forecast URL');

        const forecastResponse = await fetch(forecastUrl, {
          headers: { Accept: 'application/geo+json' },
          signal: controller.signal,
        });
        if (!forecastResponse.ok) throw new Error('Forecast unavailable');
        const forecastData = await forecastResponse.json() as ForecastResponse;
        const nextPeriods = Array.isArray(forecastData.properties?.periods)
          ? forecastData.properties.periods.slice(0, 4)
          : [];
        if (nextPeriods.length === 0) throw new Error('No forecast periods');
        if (!controller.signal.aborted) setPeriods(nextPeriods);
      } catch {
        if (!controller.signal.aborted) {
          setPeriods([]);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadForecast();
    return () => controller.abort();
  }, [latitude, longitude, simulationMode]);

  if (simulationMode) return null;

  const officialForecastUrl = point
    ? `https://forecast.weather.gov/MapClick.php?lat=${point.lat}&lon=${point.lng}`
    : 'https://www.weather.gov/';

  return (
    <section className="panel mb-3 overflow-hidden" aria-label="Local forecast outlook">
      <div className="panel-header">
        <CloudSun size={17} className="text-brand-600" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">Local forecast outlook</h2>
          <p className="text-[11px] text-ink-muted">NWS point forecast · separate from active alerts</p>
        </div>
        <a href={officialForecastUrl} target="_blank" rel="noreferrer noopener" className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-700 hover:underline">
          Official forecast <ExternalLink size={12} />
        </a>
      </div>

      <div className="p-3">
        {loading && (
          <p className="flex items-center gap-2 py-2 text-xs text-ink-muted" role="status">
            <Loader2 size={14} className="animate-spin" /> Loading the forecast for this location…
          </p>
        )}
        {!loading && error && (
          <p className="text-xs leading-relaxed text-ink-soft">
            The point forecast could not be loaded right now. This does not change the active-alert results above. Check the official NWS forecast for current guidance.
          </p>
        )}
        {!loading && !error && periods.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {periods.map((period) => (
              <article key={period.number} className="rounded-lg border border-line-soft bg-slate-50/60 p-3">
                <p className="text-xs font-semibold text-ink">{period.name}</p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-ink">
                  {period.temperature}°{period.temperatureUnit}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">{period.shortForecast}</p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ink-muted">
                  {period.probabilityOfPrecipitation?.value != null && <span>Precipitation: {period.probabilityOfPrecipitation.value}%</span>}
                  {period.windSpeed && <span>Wind: {period.windSpeed} {period.windDirection ?? ''}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="mt-3 border-t border-line-soft pt-2 text-[10px] leading-relaxed text-ink-muted">
          Forecast guidance describes expected conditions, not an active warning. A forecast or Hazardous Weather Outlook can mention possible hazards even when no active alert applies to this point. Follow any official alert instructions.
        </p>
      </div>
    </section>
  );
}
