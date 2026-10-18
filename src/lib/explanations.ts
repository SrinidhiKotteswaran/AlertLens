import type {
  HazardCategory,
} from '@/types/domain';
import type { NwsAlertProperties, NwsSeverity, NwsUrgency, NwsCertainty } from '@/types/nws';

/**
 * Deterministic, hazard-specific explanation templates.
 *
 * These templates NEVER invent facts, predict storm paths, estimate
 * probabilities, or override official instructions. They surface the
 * official NWS fields in plain English and add only generic, hazard-class
 * context that is true regardless of the specific alert.
 */

const WATCH_VS_WARNING: Record<string, string> = {
  watch:
    'A Watch means conditions are favorable for this hazard to develop. It is a "be prepared" message — stay informed and be ready to act.',
  warning:
    'A Warning means the hazard is occurring or imminent. It is a "take action now" message — follow the official instructions immediately.',
  advisory:
    'An Advisory indicates weather that is not necessarily life-threatening but could cause significant inconvenience and, if caution is not exercised, could lead to situations that may threaten life or property.',
  statement: 'A Statement provides information or follow-up detail about an active hazard.',
};

function alertKindFromEvent(event: string): 'watch' | 'warning' | 'advisory' | 'statement' {
  const e = event.toLowerCase();
  if (e.includes('warning')) return 'warning';
  if (e.includes('watch')) return 'watch';
  if (e.includes('advisory')) return 'advisory';
  return 'statement';
}

function severityPhrase(severity: NwsSeverity): string {
  switch (severity) {
    case 'Extreme':
      return 'Extreme severity — the hazard is expected to be extraordinary.';
    case 'Severe':
      return 'Severe severity — the hazard is expected to be dangerous.';
    case 'Moderate':
      return 'Moderate severity — the hazard could cause noticeable disruption.';
    case 'Minor':
      return 'Minor severity — the hazard is expected to be limited in impact.';
    default:
      return 'Severity was not specified by the source.';
  }
}

function urgencyPhrase(urgency: NwsUrgency): string {
  switch (urgency) {
    case 'Immediate':
      return 'responsive action should be taken now';
    case 'Expected':
      return 'responsive action should be taken soon';
    case 'Future':
      return 'the hazard is expected in the near future';
    case 'Past':
      return 'the hazard has largely passed';
    default:
      return 'the timing of any action is unclear';
  }
}

function certaintyPhrase(certainty: NwsCertainty): string {
  switch (certainty) {
    case 'Observed':
      return 'the hazard has been observed';
    case 'Likely':
      return 'the hazard is likely';
    case 'Possible':
      return 'the hazard is possible';
    case 'Unlikely':
      return 'the hazard is unlikely';
    default:
      return 'the likelihood is unknown';
  }
}

/** Build a short plain-English summary strictly from official source fields. */
export function hazardSummary(
  event: string,
  severity: NwsSeverity,
  urgency: NwsUrgency,
  certainty: NwsCertainty,
  areaDesc: string,
): string {
  const kind = alertKindFromEvent(event);
  const kindPhrase = WATCH_VS_WARNING[kind] ?? '';
  const area = areaDesc.trim() || 'the listed area';
  const head = `${event} is active for ${area}.`;
  const detail = `${severityPhrase(severity)} ${capitalize(certaintyPhrase(certainty))}, and ${urgencyPhrase(urgency)}.`;
  const kindLine = kindPhrase;
  return [head, detail, kindLine].filter(Boolean).join(' ');
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Explain what AlertLens can and cannot establish for this alert. */
export function hazardCaveats(event: string, hasGeometry: boolean, instruction: string | null): string[] {
  const caveats: string[] = [];
  if (!hasGeometry) {
    caveats.push(
      'No validated boundary geometry was supplied for this alert. AlertLens cannot determine whether your selected point is inside the affected area; it can only show the official area description in words.',
    );
  } else {
    caveats.push(
      'A validated boundary was supplied. AlertLens can test whether your selected point lies inside it, but this does not guarantee safety outside the boundary.',
    );
  }
  if (!instruction) {
    caveats.push(
      'The official source did not include specific instructions with this alert. AlertLens provides a hazard-class safety reference below; follow any instructions from local officials.',
    );
  }
  caveats.push(
    'AlertLens does not predict storm movement, estimate hazard probability, or override official instructions.',
  );
  return caveats;
}

/** Official-safety reference links, by hazard category. Sourced from weather.gov safety pages. */
export const HAZARD_SAFETY_LINKS: Record<HazardCategory, { label: string; url: string }> = {
  tornado: {
    label: 'NWS Tornado Safety',
    url: 'https://www.weather.gov/safety/tornado',
  },
  flood: {
    label: 'NWS Flood Safety',
    url: 'https://www.weather.gov/safety/flood',
  },
  thunder: {
    label: 'NWS Thunderstorm & Lightning Safety',
    url: 'https://www.weather.gov/safety/thunderstorm',
  },
  winter: {
    label: 'NWS Winter Weather Safety',
    url: 'https://www.weather.gov/safety/winter',
  },
  general: {
    label: 'NWS Weather Safety',
    url: 'https://www.weather.gov/safety',
  },
};

/** A one-line hazard-class safety reminder, distinct from official instructions. */
export function hazardClassReminder(category: HazardCategory): string {
  switch (category) {
    case 'tornado':
      return 'General tornado safety: move to an interior, lowest-level room away from windows. If outdoors or in a vehicle, do not try to outrun a tornado — seek sturdy shelter immediately.';
    case 'flood':
      return 'General flood safety: never drive or walk through flood waters. "Turn Around, Don\'t Drown." Move to higher ground if advised.';
    case 'thunder':
      return 'General thunderstorm safety: when thunder roars, go indoors. Avoid open areas, isolated trees, and water during a storm.';
    case 'winter':
      return 'General winter safety: minimize travel, dress in layers, and keep an emergency kit in your vehicle. Check on neighbors.';
    default:
      return 'Follow instructions from local officials and monitor official sources for updates.';
  }
}

/** Format the raw NWS description into paragraphs (NWS uses \n\n). */
export function formatDescription(description: string | null): string[] {
  if (!description) return [];
  return description
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0);
}

export function formatInstruction(instruction: string | null): string[] {
  if (!instruction) return [];
  return instruction
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter((p) => p.length > 0);
}

/** Severity → display color token. Used by indicators, not as a safety claim. */
export function severityColor(severity: NwsSeverity): string {
  switch (severity) {
    case 'Extreme':
      return '#7A1212';
    case 'Severe':
      return '#B3261E';
    case 'Moderate':
      return '#C4661F';
    case 'Minor':
      return '#5A6B7A';
    default:
      return '#6B7280';
  }
}

/** Hazard category → display color token. */
export function hazardColor(category: HazardCategory): string {
  switch (category) {
    case 'tornado':
      return '#B3261E';
    case 'flood':
      return '#1565C0';
    case 'thunder':
      return '#E07B00';
    case 'winter':
      return '#5A6B7A';
    default:
      return '#6B7280';
  }
}

/** Human-readable label for the alert kind (watch/warning/advisory/statement). */
export function alertKindLabel(event: string): string {
  return alertKindFromEvent(event);
}

/** The full alert-kind explanation used in the explanation panel. */
export function alertKindExplanation(event: string): string {
  return WATCH_VS_WARNING[alertKindFromEvent(event)] ?? '';
}

export type { NwsAlertProperties };
