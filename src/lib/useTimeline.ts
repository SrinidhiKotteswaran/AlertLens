import { useCallback, useRef, useState } from 'react';
import type { NormalizedAlert, TimelineEntry } from '@/types/domain';

/**
 * Session-only timeline state.
 *
 * Tracks official alert identifiers and successive observations of their
 * metadata during a session. We NEVER invent historical updates. A change
 * is only recorded when we actually retrieve a new response that differs
 * meaningfully from the previous observation of the same alert.
 *
 * Missing alerts are labeled "not_returned" — NOT "cancelled" — because
 * a missing alert may reflect expiration, filtering, or a data issue.
 */

interface TrackedAlert {
  lastSignature: string;
  lastSeenAt: Date;
  sourceTimestampIso: string | null;
  /** Snapshot of fields used for change descriptions. */
  snapshot: {
    expiresIso: string | null;
    instruction: string | null;
    severity: string;
    certainty: string;
  };
}

export interface TimelineState {
  entries: TimelineEntry[];
  tracked: Map<string, TrackedAlert>;
}

function snapshotOf(a: NormalizedAlert) {
  return {
    expiresIso: a.sourceExpiresIso,
    instruction: a.instruction,
    severity: a.severity,
    certainty: a.certainty,
  };
}

function entriesEqual(a: NormalizedAlert['severity'], b: string): boolean {
  return a === b;
}

export interface UseTimelineResult {
  entries: TimelineEntry[];
  /**
   * Record a new observation of the currently active alerts.
   * Returns the new timeline entries produced by this observation.
   */
  observe: (alerts: NormalizedAlert[], observedAt: Date) => TimelineEntry[];
  reset: () => void;
}

export function useTimeline(): UseTimelineResult {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const trackedRef = useRef<Map<string, TrackedAlert>>(new Map());

  const observe = useCallback((alerts: NormalizedAlert[], observedAt: Date): TimelineEntry[] => {
    const tracked = trackedRef.current;
    const newEntries: TimelineEntry[] = [];
    const seenIds = new Set<string>();

    for (const a of alerts) {
      seenIds.add(a.id);
      const prev = tracked.get(a.id);
      const snap = snapshotOf(a);

      if (!prev) {
        newEntries.push({
          alertId: a.id,
          observedAt,
          changeType: 'new',
          summary: `${a.event} newly detected for ${a.areaDesc}.`,
          sourceTimestampIso: a.sourceUpdatedIso ?? a.sourceSentIso,
        });
        tracked.set(a.id, {
          lastSignature: a.signature,
          lastSeenAt: observedAt,
          sourceTimestampIso: a.sourceUpdatedIso ?? a.sourceSentIso,
          snapshot: snap,
        });
        continue;
      }

      if (prev.lastSignature === a.signature) {
        // No meaningful change; optionally record a no-op heartbeat (kept off the timeline).
        tracked.set(a.id, {
          ...prev,
          lastSeenAt: observedAt,
        });
        continue;
      }

      // Detect specific meaningful changes (in priority order).
      if (prev.snapshot.severity !== snap.severity) {
        newEntries.push({
          alertId: a.id,
          observedAt,
          changeType: 'severity_changed',
          summary: `Severity changed from ${prev.snapshot.severity} to ${snap.severity}.`,
          sourceTimestampIso: a.sourceUpdatedIso ?? a.sourceSentIso,
        });
      } else if (prev.snapshot.certainty !== snap.certainty) {
        newEntries.push({
          alertId: a.id,
          observedAt,
          changeType: 'certainty_changed',
          summary: `Certainty changed from ${prev.snapshot.certainty} to ${snap.certainty}.`,
          sourceTimestampIso: a.sourceUpdatedIso ?? a.sourceSentIso,
        });
      } else if (prev.snapshot.expiresIso !== snap.expiresIso) {
        newEntries.push({
          alertId: a.id,
          observedAt,
          changeType: 'expires_changed',
          summary: `Expiration time changed from ${prev.snapshot.expiresIso ?? 'unspecified'} to ${snap.expiresIso ?? 'unspecified'}.`,
          sourceTimestampIso: a.sourceUpdatedIso ?? a.sourceSentIso,
        });
      } else if (prev.snapshot.instruction !== snap.instruction) {
        newEntries.push({
          alertId: a.id,
          observedAt,
          changeType: 'instruction_changed',
          summary: `Official instructions were updated.`,
          sourceTimestampIso: a.sourceUpdatedIso ?? a.sourceSentIso,
        });
      } else {
        newEntries.push({
          alertId: a.id,
          observedAt,
          changeType: 'updated',
          summary: `Alert metadata was updated.`,
          sourceTimestampIso: a.sourceUpdatedIso ?? a.sourceSentIso,
        });
      }

      tracked.set(a.id, {
        lastSignature: a.signature,
        lastSeenAt: observedAt,
        sourceTimestampIso: a.sourceUpdatedIso ?? a.sourceSentIso,
        snapshot: snap,
      });
    }

    // Alerts that were previously active but are no longer returned.
    for (const [id, prev] of tracked) {
      if (seenIds.has(id)) continue;
      newEntries.push({
        alertId: id,
        observedAt,
        changeType: 'not_returned',
        summary:
          'Alert is no longer returned as active. This may reflect expiration, filtering, or a data issue — AlertLens cannot confirm cancellation from a missing response alone.',
        sourceTimestampIso: prev.sourceTimestampIso,
      });
      tracked.delete(id);
    }

    if (newEntries.length > 0) {
      setEntries((prev) => [...prev, ...newEntries]);
    }
    return newEntries;
  }, []);

  const reset = useCallback(() => {
    trackedRef.current = new Map();
    setEntries([]);
  }, []);

  return { entries, observe, reset };
}

export { entriesEqual };
