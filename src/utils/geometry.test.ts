import { describe, it, expect } from 'vitest';
import { dist, projectPointOnSegment, wallPolygon } from './geometry';
import { Wall } from '../types';

describe('geometry', () => {
  it('calculates the distance between two points', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  describe('projectPointOnSegment', () => {
    it('projects onto the interior of a horizontal segment', () => {
      const r = projectPointOnSegment(
        { x: 3, y: 2 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      );
      expect(r.point).toEqual({ x: 3, y: 0 });
      expect(r.distance).toBeCloseTo(2);
    });

    it('clamps to the start endpoint when t < 0', () => {
      const r = projectPointOnSegment(
        { x: -5, y: 1 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      );
      expect(r.point).toEqual({ x: 0, y: 0 });
      expect(r.distance).toBeCloseTo(Math.sqrt(26));
    });

    it('clamps to the end endpoint when t > 1', () => {
      const r = projectPointOnSegment(
        { x: 15, y: 0 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      );
      expect(r.point).toEqual({ x: 10, y: 0 });
      expect(r.distance).toBeCloseTo(5);
    });

    it('returns the start for a zero-length segment', () => {
      const r = projectPointOnSegment(
        { x: 3, y: 4 },
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      );
      expect(r.point).toEqual({ x: 0, y: 0 });
      expect(r.distance).toBe(5);
    });
  });

  describe('wallPolygon', () => {
    const base: Wall = {
      id: 'w1',
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
      thickness: 2,
      length: 10,
    };

    it('builds a rectangle around a horizontal wall', () => {
      expect(wallPolygon(base)).toBe('0,1 10,1 10,-1 0,-1');
    });

    it('returns the degenerate polygon when start equals end', () => {
      expect(wallPolygon({ ...base, end: { x: 0, y: 0 } })).toBe('0,0 0,0 0,0 0,0');
    });

    it('returns the degenerate polygon for non-finite coordinates', () => {
      expect(wallPolygon({ ...base, end: { x: NaN, y: 0 } })).toBe('0,0 0,0 0,0 0,0');
    });

    it('returns the degenerate polygon for non-positive thickness', () => {
      expect(wallPolygon({ ...base, thickness: 0 })).toBe('0,0 0,0 0,0 0,0');
    });
  });
});
