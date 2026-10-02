import { Point, Wall } from '../types';

// calculate the distance between two points
export function dist(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

// helper to get the distance from raw coordinates
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// how close an endpoint needs to be to snap
export const SNAP_DIST = 0.5;

/**
 * Project a point onto a line segment and return the closest point on it
 * along with the distance from the original point to that projection.
 * All coordinates are in world units.
 *
 * @param p  point being projected
 * @param a  segment start
 * @param b  segment end
 * @returns  closest point on segment [a, b] and its distance to `p`;
 *          returns `a` with `dist(p, a)` if the segment has zero length.
 */
export function projectPointOnSegment(
  p: Point,
  a: Point,
  b: Point,
): { point: Point; distance: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { point: { x: a.x, y: a.y }, distance: dist(p, a) };
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return { point, distance: dist(p, point) };
}

// build the polygon points string for a wall with thickness
export function wallPolygon(wall: Wall): string {
  // degenerate polygon reused for any input that can't produce a real rectangle
  const empty = '0,0 0,0 0,0 0,0';
  try {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (!Number.isFinite(len) || len === 0) return empty;
    if (!Number.isFinite(wall.thickness) || wall.thickness <= 0) return empty;

    const nx = (-dy / len) * (wall.thickness / 2);
    const ny = (dx / len) * (wall.thickness / 2);
    const p1 = `${wall.start.x + nx},${wall.start.y + ny}`;
    const p2 = `${wall.end.x + nx},${wall.end.y + ny}`;
    const p3 = `${wall.end.x - nx},${wall.end.y - ny}`;
    const p4 = `${wall.start.x - nx},${wall.start.y - ny}`;
    return `${p1} ${p2} ${p3} ${p4}`;
  } catch {
    return empty;
  }
}
