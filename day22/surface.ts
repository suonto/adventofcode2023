import { Point } from '../util/point';

export class Surface {
  start: Point;
  end: Point;
  z: number;

  constructor(params: { start: Point; end: Point; z: number }) {
    const { start, end, z } = params;
    this.start = { x: start.x, y: start.y };
    this.end = { x: end.x, y: end.y };
    this.z = z;
  }

  overlap(other: Surface): Surface | undefined {
    if (this.z !== other.z) {
      throw new Error('Not intended surfaces with different z.');
    }
    for (const prop of ['x', 'y'] as const) {
      if (
        other.start[prop] >= this.end[prop] ||
        this.start[prop] >= other.end[prop]
      ) {
        return undefined;
      }
    }
    return new Surface({
      start: {
        x: Math.max(this.start.x, other.start.x),
        y: Math.max(this.start.y, other.start.y),
      },
      end: {
        x: Math.min(this.end.x, other.end.x),
        y: Math.min(this.end.y, other.end.y),
      },
      z: this.z,
    });
  }
}
