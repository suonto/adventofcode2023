import { open } from 'node:fs/promises';
import path from 'node:path';
import { Point } from '../util/point';

type Pos3D = Point & {
  z: number;
};

type Surface = {
  start: Point;
  end: Point;
  z: number;
};

class Brick {
  start: Pos3D;
  end: Pos3D;

  constructor(params: { start: Pos3D; end: Pos3D }) {
    this.start = params.start;
    this.end = params.end;
  }

  decend(h: number) {
    this.start.z -= h;
    this.end.z -= h;
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

  bricks.sort((a, b) => a.start.z - b.start.z);
  bricks.forEach((b) => console.log(b));

  for (const brick of bricks) {
  }
})();
