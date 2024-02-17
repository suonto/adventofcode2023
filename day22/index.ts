import debug from 'debug';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { Point } from '../util/point';
import { Surface } from './surface';

type Pos3D = Point & {
  z: number;
};

class Brick {
  name?: string;
  top: Surface;
  bot: Surface;
  supporters: Brick[] = [];

  constructor(params: { start: Pos3D; end: Pos3D; name?: string }) {
    const { start, end, name } = params;
    this.name = name;
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

  registerSupport(other: Brick) {
    this.supporters.push(other);
  }

  decend(h: number) {
    this.bot.z -= h;
    this.top.z -= h;
  }

  decendTo(h: number) {
    const diff = this.bot.z - h;
    this.decend(diff);
  }
}

class Djenga {
  private readonly d = debug('djenga');
  bricks: Brick[] = [];

  addBrick(brick: Brick): void {
    const supporterCandidates = [...this.bricks].sort(
      (a, b) => a.top.z - b.top.z,
    );
    let candidate = supporterCandidates.pop();
    while (candidate && !brick.supporters.length) {
      const height = candidate?.top.z ?? 0;
      brick.decendTo(height);
      while (candidate?.top.z === height) {
        if (candidate.top.overlap(brick.bot)) {
          this.d(candidate?.name, 'supports', brick.name, 'at height', height);
          brick.registerSupport(candidate);
        }
        candidate = supporterCandidates.pop();
      }
    }

    this.bricks.push(brick);
    this.d('Added brick:', brick.name, 'to floor', brick.bot.z);
  }

  critical(): Brick[] {
    return this.bricks
      .filter((b) => b.supporters.length === 1)
      .map((b) => b.supporters[0]);
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
  const dMain = debug('main');

  const bricks: Brick[] = [];
  const names = true;
  for await (const line of file.readLines()) {
    const brick = parseLine(line);
    if (names) brick.name = String.fromCharCode(97 + bricks.length);
    bricks.push(brick);
  }

  bricks.sort((a, b) => a.bot.z - b.bot.z);

  const djenga = new Djenga();
  for (const brick of bricks) {
    djenga.addBrick(brick);
  }
  const critical = djenga.critical();

  if (names)
    dMain(
      djenga.bricks.filter((b) => !critical.includes(b)).map((b) => b.name),
    );
  dMain(djenga.bricks.filter((b) => !critical.includes(b)).length);
})();
