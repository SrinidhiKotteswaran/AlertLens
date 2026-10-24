import { describe, expect, it } from 'vitest';
import { NO_GEOMETRY_ALERT, SIMULATION_SCENARIOS } from '@/lib/simulation';

describe('simulation alert fixtures', () => {
  it('keeps every demonstration alert current when the app loads', () => {
    const now = Date.now();
    const alerts = [
      ...SIMULATION_SCENARIOS.map((scenario) => scenario.alert),
      NO_GEOMETRY_ALERT,
    ];

    for (const alert of alerts) {
      const sentAt = new Date(alert.properties.sent).getTime();
      const expiresAt = new Date(alert.properties.expires ?? '').getTime();

      expect(Number.isFinite(sentAt)).toBe(true);
      expect(sentAt).toBeLessThanOrEqual(now);
      expect(Number.isFinite(expiresAt)).toBe(true);
      expect(expiresAt).toBeGreaterThan(now);
    }
  });
});
