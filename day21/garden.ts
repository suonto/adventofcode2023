import { Point } from '../util/point';

export type Terrain = '#' | '.' | 'S' | 'B';

export class Garden {
  readonly grid: Terrain[][] = [];

  constructor(lines: string[]) {
    for (const line of lines) {
      this.grid.push(line.split('') as Terrain[]);
    }
  }

  getTerrain(pos: Point): Terrain | undefined {
    return this.grid.at(pos.y)?.at(pos.x);
  }

  setBlinker(pos: Point): void {
    if (this.getTerrain(pos) !== 'S') {
      this.grid[pos.y][pos.x] = 'B';
    }
  }

  getStart(): Point {
    for (let y = 0; y < this.grid.length; y++) {
      const row = this.grid[y];
      const x = row.indexOf('S');
      if (x !== -1) {
        return { x, y };
      }
    }
    throw new Error('No start');
  }
}
