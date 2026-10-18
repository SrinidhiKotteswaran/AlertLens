import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, MapPin, X, AlertTriangle } from 'lucide-react';
import type { GeocodedPlace, GeoPoint } from '@/types/domain';
import { geocode, GeocodeError, GEOCODE_ATTRIBUTION } from '@/lib/geocodeClient';

export interface LocationSearchProps {
  onSelect: (place: GeocodedPlace) => void;
  onUseCoordinates?: (point: GeoPoint, label: string) => void;
  currentLabel?: string | null;
}

export function LocationSearch({ onSelect, onUseCoordinates, currentLabel }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    const handle = setTimeout(() => {
      geocode(query, ctrl.signal)
        .then((r) => {
          setResults(r);
          setHighlight(0);
          setLoading(false);
          setOpen(true);
        })
        .catch((err: unknown) => {
          if (ctrl.signal.aborted) return;
          if (err instanceof GeocodeError) {
            setError(err.message);
          } else {
            setError('Address search failed.');
          }
          setResults([]);
          setLoading(false);
        });
    }, 350);

    return () => {
      clearTimeout(handle);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Allow "lat,lng" direct entry.
  function tryParseCoords(s: string): GeoPoint | null {
    const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(s);
    if (!m) return null;
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }

  function commit(place: GeocodedPlace) {
    onSelect(place);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (results.length > 0) {
      commit(results[Math.min(highlight, results.length - 1)]);
      return;
    }
    const coords = tryParseCoords(query);
    if (coords && onUseCoordinates) {
      onUseCoordinates(coords, `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      setQuery('');
      setOpen(false);
      return;
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
      setOpen(true);
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={onSubmit} className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          size={16}
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Enter your address or ZIP code"
          aria-label="Enter your address or ZIP code"
          className="w-full pl-9 pr-9 py-2.5 text-sm bg-white border border-line rounded-md
                     text-ink placeholder:text-ink-muted
                     focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink rounded"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </form>

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-500" aria-live="polite">
          <Loader2 size={16} className="animate-spin" />
        </div>
      )}

      {error && (
        <div
          className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          role="alert"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {open && results.length > 0 && (
        <ul
          role="listbox"
          aria-label="Search results"
          className="absolute z-[1200] mt-1 w-full max-h-72 overflow-auto bg-white border border-line rounded-md shadow-elevated"
        >
          {results.map((r, i) => (
            <li key={r.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => commit(r)}
                className={`flex items-start gap-2 w-full text-left px-3 py-2 text-sm transition-colors
                  ${i === highlight ? 'bg-brand-50' : 'bg-white hover:bg-brand-50/60'}`}
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-brand-500" />
                <span className="text-ink leading-snug">{r.label}</span>
              </button>
            </li>
          ))}
          <li className="px-3 py-1.5 text-[10px] text-ink-muted border-t border-line-soft">
            {GEOCODE_ATTRIBUTION}
          </li>
        </ul>
      )}

      {currentLabel && !open && (
        <div className="mt-1.5 text-xs text-ink-muted truncate">
          Selected: <span className="text-ink-soft">{currentLabel}</span>
        </div>
      )}
    </div>
  );
}
