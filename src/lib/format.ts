/** Shared formatting helpers. */

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return 'Not specified';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function formatTime(d: Date | null | undefined): string {
  if (!d) return 'Not specified';
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function formatRelative(d: Date | null | undefined, now: Date = new Date()): string {
  if (!d) return 'Not specified';
  const diffMs = d.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const suffix = diffMs >= 0 ? 'from now' : 'ago';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ${suffix}`;
  if (hours < 24) return `${hours} hr ${suffix}`;
  return `${days} day${days === 1 ? '' : 's'} ${suffix}`;
}

export function formatIso(d: Date | null | undefined): string {
  if (!d) return 'Not specified';
  return d.toISOString();
}

/** Distance (meters) → human string. */
export function formatDistance(m: number | null): string {
  if (m === null) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** Title-case a single-word urgency/severity for display. */
export function titleCase(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Clamp a number into a range. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}


/** Format the actual hazard window, separately from the NWS message-expiration time. */
export function formatAlertWindow(start: Date | null | undefined, end: Date | null | undefined): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  const fmt = (date: Date) => date.toLocaleString(undefined, options);
  if (start && end) return `Starts ${fmt(start)} · ends ${fmt(end)}`;
  if (start) return `Starts ${fmt(start)}`;
  if (end) return `Ends ${fmt(end)}`;
  return 'Hazard timing not specified';
}


/** Format the actual hazard window separately from the NWS message-expiration time. */
export function formatAlertWindow(start: Date | null | undefined, end: Date | null | undefined): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  };
  const fmt = (date: Date) => date.toLocaleString(undefined, options);
  if (start && end) return `Starts ${fmt(start)} · ends ${fmt(end)}`;
  if (start) return `Starts ${fmt(start)}`;
  if (end) return `Ends ${fmt(end)}`;
  return 'Hazard timing not specified';
}
