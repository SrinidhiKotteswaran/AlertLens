import { describe, expect, it } from 'vitest';
import { validateCommunityReport } from './communityReports';
import type { CommunityReport } from '@/components/ImpactMap';

function makeReport(overrides: Partial<CommunityReport> = {}): CommunityReport {
  return {
    id: 'test-report-1',
    point: { lat: 39.45, lng: -75.71 },
    category: 'Flooding (Street / Stream)',
    details: 'Water over the road',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('validateCommunityReport', () => {
  it('trims details and custom labels before saving', () => {
    const result = validateCommunityReport(makeReport({
      details: '  Water over the road  ',
      customHazard: '  Road flooding  ',
    }));
    expect(result.details).toBe('Water over the road');
    expect(result.customHazard).toBe('Road flooding');
  });

  it('rejects coordinates outside valid latitude/longitude ranges', () => {
    expect(() => validateCommunityReport(makeReport({ point: { lat: 91, lng: 0 } }))).toThrow(/valid location/i);
    expect(() => validateCommunityReport(makeReport({ point: { lat: 0, lng: -181 } }))).toThrow(/valid location/i);
  });

  it('rejects blank and overlong report details', () => {
    expect(() => validateCommunityReport(makeReport({ details: '   ' }))).toThrow(/1 and 280 characters/i);
    expect(() => validateCommunityReport(makeReport({ details: 'x'.repeat(281) }))).toThrow(/1 and 280 characters/i);
  });

  it('rejects overlong custom hazard labels', () => {
    expect(() => validateCommunityReport(makeReport({ customHazard: 'x'.repeat(71) }))).toThrow(/70 characters or fewer/i);
  });

  it('rejects unknown hazard categories', () => {
    expect(() => validateCommunityReport(makeReport({ category: 'Imaginary Hazard' as CommunityReport['category'] }))).toThrow(/hazard category/i);
  });

  it('rejects stale report timestamps', () => {
    const stale = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(() => validateCommunityReport(makeReport({ createdAt: stale }))).toThrow(/invalid or too old/i);
  });
});
