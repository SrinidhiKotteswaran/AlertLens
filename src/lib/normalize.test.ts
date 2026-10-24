import { describe, expect, it } from 'vitest';
import type { NwsAlertFeature } from '@/types/nws';
import { normalizeAlertsWithValidation } from '@/lib/normalize';
import { isAlertExpired, isAlertUpcoming } from '@/lib/geometry';

const NOW = new Date('2026-10-24T18:00:00.000Z');

function alert(overrides: Partial<NwsAlertFeature['properties']> = {}): NwsAlertFeature {
  return {
    id: 'https://api.weather.gov/alerts/test-alert',
    type: 'Feature',
    geometry: null,
    properties: {
      id: 'https://api.weather.gov/alerts/test-alert',
      areaDesc: 'Test County',
      event: 'Frost Advisory',
      headline: 'Frost Advisory for Test County',
      description: 'Test alert.',
      instruction: 'Protect tender plants.',
      severity: 'Minor',
      certainty: 'Likely',
      urgency: 'Expected',
      sent: '2026-10-24T14:00:00-04:00',
      effective: '2026-10-24T14:00:00-04:00',
      onset: '2026-10-24T14:00:00-04:00',
      expires: '2026-10-25T05:00:00-04:00',
      ends: '2026-10-25T09:00:00-04:00',
      updated: '2026-10-24T14:00:00-04:00',
      status: 'Actual',
      messageType: 'Alert',
      category: 'Met',
      response: 'Prepare',
      web: 'https://www.weather.gov/',
      ...overrides,
    },
  };
}

describe('live NWS alert validation', () => {
  it('keeps a valid alert whose start time has passed', () => {
    const result = normalizeAlertsWithValidation([alert()], NOW);
    expect(result.alerts).toHaveLength(1);
    expect(result.rejectedCount).toBe(0);
    expect(result.warning).toBeNull();
    expect(isAlertUpcoming(result.alerts[0], NOW)).toBe(false);
    expect(isAlertExpired(result.alerts[0], NOW)).toBe(false);
  });

  it('keeps a valid future alert but classifies it as upcoming, not active', () => {
    const result = normalizeAlertsWithValidation(
      [alert({
        effective: '2026-10-25T00:00:00-04:00',
        onset: '2026-10-25T00:00:00-04:00',
      })],
      NOW,
    );
    expect(result.alerts).toHaveLength(1);
    expect(isAlertUpcoming(result.alerts[0], NOW)).toBe(true);
    expect(isAlertExpired(result.alerts[0], NOW)).toBe(false);
  });

  it('withholds a record whose expiration has passed', () => {
    const result = normalizeAlertsWithValidation(
      [alert({ expires: '2026-10-24T09:00:00-04:00', ends: '2026-10-24T09:00:00-04:00' })],
      NOW,
    );
    expect(result.alerts).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
    expect(result.warning).toMatch(/withheld/i);
  });

  it('withholds cancelled, expired, or non-actual messages', () => {
    const result = normalizeAlertsWithValidation(
      [
        alert({ messageType: 'Cancel' }),
        alert({ messageType: 'Expire' }),
        alert({ status: 'Test' }),
        alert({ urgency: 'Past' }),
      ],
      NOW,
    );
    expect(result.alerts).toHaveLength(0);
    expect(result.rejectedCount).toBe(4);
  });

  it('withholds records missing a valid expiration timestamp', () => {
    const result = normalizeAlertsWithValidation([alert({ expires: null })], NOW);
    expect(result.alerts).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
  });

  it('withholds timestamps issued implausibly far in the future', () => {
    const result = normalizeAlertsWithValidation(
      [alert({ sent: '2026-10-25T16:00:00-04:00' })],
      NOW,
    );
    expect(result.alerts).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
  });

  it('withholds chronologically contradictory timestamps', () => {
    const result = normalizeAlertsWithValidation(
      [alert({
        onset: '2026-10-25T03:00:00-04:00',
        ends: '2026-10-25T01:00:00-04:00',
      })],
      NOW,
    );
    expect(result.alerts).toHaveLength(0);
    expect(result.rejectedCount).toBe(1);
  });
});
