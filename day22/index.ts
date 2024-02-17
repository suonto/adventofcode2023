import { open } from 'node:fs/promises';
import path from 'node:path';
import { Point } from '../util/point';
import { Surface } from './surface';

type Pos3D = Point & {
  z: number;
};

class Brick {
  top: Surface;
  bot: Surface;

  constructor(params: { start: Pos3D; end: Pos3D }) {
    const { start, end } = params;
    if (!(start.z < end.z)) {
      throw new Error('End z not gt start z');
    }
    this.bot = new Surface({
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
      z: start.z,
    });
    this.top = new Surface({
      start: { x: start.x, y: start.y },
      end: { x: end.x, y: end.y },
      z: end.z,
    });
  }

  decend(h: number) {
    this.bot.z -= h;
    this.top.z -= h;
  }
}

class Djenga {
  floors: Surface[][] = [];

  addBrick(brick: Brick): void {
    for (let i = this.floors.length - 1; i >= 0; i--) {
      const floor = this.floors[i];
      const overlaps = floor.map((s) => s.overlap(brick.bot));
    }
  }
}

function parseLine(line: string): Brick {
  const [start, end] = line
    .split('~')
    .map((s) => s.split(',').map((c) => Number.parseInt(c)));
  return new Brick({
    start: {
      x: start[0],
      y: start[1],
      z: start[2],
    },
    end: {
      x: end[0] + 1,
      y: end[1] + 1,
      z: end[2] + 1,
    },
  });
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const bricks: Brick[] = [];
  for await (const line of file.readLines()) {
    bricks.push(parseLine(line));
  }

  bricks.sort((a, b) => a.bot.z - b.bot.z);
  bricks.forEach((b) => console.log(b));

  for (const brick of bricks) {
  }
})();
