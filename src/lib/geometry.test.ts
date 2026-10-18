import { describe, expect, it } from 'vitest';
import type { NwsGeometry } from '@/types/nws';
import { computeImpact, validateGeometry } from '@/lib/geometry';

const square: NwsGeometry = {
  type: 'Polygon',
  coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
};

describe('alert boundary validation and impact', () => {
  it('returns unknown when an alert has no validated boundary', () => {
    expect(computeImpact({ lat: 5, lng: 5 }, null).state).toBe('unknown');
  });
  it('identifies a point inside a validated polygon', () => {
    expect(computeImpact({ lat: 5, lng: 5 }, validateGeometry(square)).state).toBe('inside');
  });
  it('identifies a point outside a polygon without implying safety', () => {
    const result = computeImpact({ lat: 15, lng: 15 }, validateGeometry(square));
    expect(result.state).toBe('outside');
    expect(result.reason.toLowerCase()).toContain('does not guarantee safety');
  });
  it('rejects an open, invalid polygon ring', () => {
    const invalid: NwsGeometry = { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10]]] };
    expect(validateGeometry(invalid)).toBeNull();
    expect(computeImpact({ lat: 5, lng: 5 }, validateGeometry(invalid)).state).toBe('unknown');
  });
  it('respects holes in a polygon', () => {
    const withHole: NwsGeometry = {
      type: 'Polygon',
      coordinates: [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
      ],
    };
    const geometry = validateGeometry(withHole);
    expect(computeImpact({ lat: 2, lng: 2 }, geometry).state).toBe('inside');
    expect(computeImpact({ lat: 5, lng: 5 }, geometry).state).toBe('outside');
  });
  it('handles multipolygons', () => {
    const multi: NwsGeometry = {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
        [[[10, 10], [12, 10], [12, 12], [10, 12], [10, 10]]],
      ],
    };
    expect(computeImpact({ lat: 11, lng: 11 }, validateGeometry(multi)).state).toBe('inside');
    expect(computeImpact({ lat: 5, lng: 5 }, validateGeometry(multi)).state).toBe('outside');
  });
});
