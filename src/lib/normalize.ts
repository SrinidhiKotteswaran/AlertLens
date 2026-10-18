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

export function normalizeAlerts(features: NwsAlertFeature[]): NormalizedAlert[] {
  return features.map(normalizeAlert);
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
