import type { NwsAlertFeature, NwsAlertProperties } from '@/types/nws';
import type { NormalizedAlert, HazardCategory } from '@/types/domain';
import { validateGeometry, classifyHazard } from './geometry';
import { hazardSummary, hazardCaveats } from '@/lib/explanations';

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Build a stable signature of fields whose change is meaningful to surface
 * in the timeline. Excludes cosmetic-only fields. Used by timeline state.
 */
export function alertSignature(p: NwsAlertProperties, geomPresent: boolean): string {
  return [
    p.id,
    p.event,
    p.severity,
    p.certainty,
    p.urgency,
    p.expires ?? '',
    p.ends ?? '',
    p.instruction ? hashString(p.instruction) : '',
    p.headline ?? '',
    geomPresent ? '1' : '0',
  ].join('|');
}

function hashString(s: string): string {
  // Lightweight, stable-enough hash for change detection.
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export function normalizeAlert(feature: NwsAlertFeature): NormalizedAlert {
  const p = feature.properties;
  const geom = validateGeometry(feature.geometry);
  const category: HazardCategory = classifyHazard(p.event);

  const effective = parseDate(p.effective);
  const onset = parseDate(p.onset);
  const expires = parseDate(p.expires);
  const ends = parseDate(p.ends);
  const updated = parseDate(p.updated);
  const sent = parseDate(p.sent) ?? new Date();

  const summary = hazardSummary(p.event, p.severity, p.urgency, p.certainty, p.areaDesc);
  const caveats = hazardCaveats(p.event, !!geom, p.instruction);

  return {
    id: p.id,
    rawId: p.id,
    event: p.event,
    headline: p.headline,
    description: p.description,
    instruction: p.instruction,
    areaDesc: p.areaDesc,
    severity: p.severity,
    urgency: p.urgency,
    certainty: p.certainty,
    sent,
    effective,
    onset,
    expires,
    ends,
    updated,
    status: p.status,
    messageType: p.messageType,
    response: p.response,
    web: p.web ?? null,
    geometry: geom,
    hasGeometry: !!geom,
    hazardCategory: category,
    summary,
    caveats,
    signature: alertSignature(p, !!geom),
    sourceSentIso: p.sent,
    sourceUpdatedIso: toIso(updated),
    sourceExpiresIso: toIso(expires),
    sourceEffectiveIso: toIso(effective),
  };
}

export interface AlertValidationResult {
  alerts: NormalizedAlert[];
  rejectedCount: number;
  warning: string | null;
}

/**
 * Validate records returned by the NWS active endpoint before they can reach
 * the live UI. NWS may include alerts that are not yet in effect, so upcoming
 * alerts are retained and labelled separately by the UI. Expired, cancelled,
 * malformed, future-issued, or chronologically contradictory records are
 * withheld rather than presented as current alerts.
 */
export function normalizeAlertsWithValidation(
  features: NwsAlertFeature[],
  now: Date = new Date(),
): AlertValidationResult {
  const alerts: NormalizedAlert[] = [];
  let rejectedCount = 0;
  const maxFutureSentMs = now.getTime() + 5 * 60_000;

  for (const feature of features) {
    const p = feature?.properties;
    if (!p) {
      rejectedCount++;
      continue;
    }

    const status = (p.status ?? '').trim().toLowerCase();
    const messageType = (p.messageType ?? '').trim().toLowerCase();
    const urgency = (p.urgency ?? '').trim().toLowerCase();
    const sent = parseDate(p.sent);
    const effective = parseDate(p.effective);
    const onset = parseDate(p.onset);
    const expires = parseDate(p.expires);
    const ends = parseDate(p.ends);
    const updated = parseDate(p.updated);

    const invalidOptionalDate =
      (!!p.effective && !effective) ||
      (!!p.onset && !onset) ||
      (!!p.ends && !ends) ||
      (!!p.updated && !updated);

    const invalid =
      status !== 'actual' ||
      !['alert', 'update'].includes(messageType) ||
      urgency === 'past' ||
      !sent ||
      sent.getTime() > maxFutureSentMs ||
      !expires ||
      invalidOptionalDate ||
      expires.getTime() <= now.getTime() ||
      (!!ends && ends.getTime() <= now.getTime()) ||
      (!!effective && effective.getTime() > expires.getTime()) ||
      (!!onset && onset.getTime() > expires.getTime()) ||
      (!!ends && !!onset && ends.getTime() < onset.getTime()) ||
      (!!ends && ends.getTime() < sent.getTime());

    if (invalid) {
      rejectedCount++;
      continue;
    }

    alerts.push(normalizeAlert(feature));
  }

  return {
    alerts,
    rejectedCount,
    warning: rejectedCount
      ? `${rejectedCount} NWS alert record${rejectedCount === 1 ? ' was' : 's were'} withheld because its status, structured timestamps, or headline times were expired, incomplete, or inconsistent. Verify current alerts at the official NWS source.`
      : null,
  };
}

export function normalizeAlerts(features: NwsAlertFeature[]): NormalizedAlert[] {
  return normalizeAlertsWithValidation(features).alerts;
}

/** Convert an observation's raw unit values into human-friendly numbers. */
export function cToUserTempC(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

export function mpsToKph(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value * 3.6 * 10) / 10;
}

export function mmFromMeters(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value * 1000 * 100) / 100;
}
