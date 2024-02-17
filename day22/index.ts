import debug from 'debug';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { Point } from '../util/point';
import { Surface } from './surface';

type Pos3D = Point & {
  z: number;
};

class Brick {
  private readonly d = debug('brick');
  name?: string;
  top: Surface;
  bot: Surface;
  supportsDirectly: Brick[] = [];
  supportsIndirectly: Brick[] | undefined = undefined;
  supportedBy: Brick[] = [];
  criticallySupports: Brick[] | undefined = undefined;

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
    other.supportsDirectly.push(this);
    this.supportedBy.push(other);
  }

  supports(): Brick[] {
    if (!this.supportsIndirectly) {
      this.supportsIndirectly = [];
      for (const direct of this.supportsDirectly) {
        const supports = direct.supports();
        for (const brick of supports.filter(
          (b) => !this.supportsIndirectly?.includes(b),
        )) {
          this.supportsIndirectly.push(brick);
        }
      }
    }

    return [...this.supportsDirectly, ...this.supportsIndirectly];
  }

  getCriticallySupports(): Brick[] {
    this.d(this.name, 'criticallySupports');

    if (!this.criticallySupports) {
      const supportees = this.supports();
      let result = [...supportees];

      for (const supportee of supportees) {
        this.d(supportee.name);
        if (
          !supportee.supportedBy.every((b) => [this, ...supportees].includes(b))
        ) {
          for (const toBeRemoved of [supportee, ...supportee.supports()]) {
            result = result.filter((b) => b.name !== toBeRemoved.name);
            this.d('toBeRemoved', toBeRemoved.name);
          }
        }
      }
      this.criticallySupports = result;
    }
    return this.criticallySupports;
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
    while (candidate && !brick.supportedBy.length) {
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
    const critical: Brick[] = [];
    for (const brick of this.bricks) {
      if (brick.supportedBy.length === 1) {
        const supporter = brick.supportedBy[0];
        if (!critical.includes(supporter)) {
          critical.push(supporter);
        }
      }
    }
    return critical;
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
  const names = false;
  let brickIndex = 0;
  for await (const line of file.readLines()) {
    const brick = parseLine(line);
    brick.name = names
      ? String.fromCharCode(97 + bricks.length)
      : `${brickIndex++}`;
    bricks.push(brick);
  }

  bricks.sort((a, b) => a.bot.z - b.bot.z);

  const djenga = new Djenga();
  for (const brick of bricks) {
    djenga.addBrick(brick);
  }
  const critical = djenga.critical();

  let sum = 0;
  for (const brick of critical) {
    const supports = brick.getCriticallySupports();
    sum += supports.length;
    dMain(brick.name, 'supports', supports.length, 'sum', sum);
  }
})();
