import debug from 'debug';
import { Direction, diffs, directions } from '../util/directions';
import { Point, samePoint } from '../util/point';
import { Garden } from './garden';

/**
 * Garden elfs are dumb. They can only remember:
 *  - current heading
 *  - current position
 *
 * Garden elfs are fragile:
 *  - if they hit a rock they die of injury
 *  - if they exit the garden they die due to existential crisis
 *  - if they come across their own path they die out of shame
 *
 * Good thing that they're clonable.
 */
export class Elf {
  private readonly d = debug('elf');
  private readonly garden: Garden;
  pos: Point;
  heading: Direction;

  constructor(params: { garden: Garden; pos: Point; heading: Direction }) {
    this.garden = params.garden;
    this.pos = params.pos;
    this.heading = params.heading;
  }

  /**
   * Take a step.
   * @returns this if still alive.
   */
  step(): Elf | undefined {
    this.d('step', this.pos);
    const { x: diffX, y: diffY } = diffs(this.heading);
    const newPos = { x: this.pos.x + diffX, y: this.pos.y + diffY };
    const terrain = this.garden.getTerrain(newPos);

    // Contemplate existential questions (and possibly die)
    if (!terrain) {
      this.d('death (existential)', this.pos);
      return undefined;
    } else if (terrain === '#') {
      this.d('death (injury)', this.pos);
      return undefined;
    } else if (terrain === 'B') {
      this.d('death (shame)', this.pos);
      return undefined;
    }

    // take step
    this.garden.setBlinker(newPos);
    this.pos = newPos;
    this.d('stepped', this.pos);
    return this;
  }

  /**
   * Spawn new elfs from current position to every direction.
   */
  spawnClones(): Elf[] {
    return directions.map((d) => {
      const clone = this.clone();
      clone.heading = d;
      return clone;
    });
  }

  clone() {
    return new Elf({
      garden: this.garden,
      pos: { ...this.pos },
      heading: this.heading,
    });
  }

  occupies(pos: Point): boolean {
    return samePoint(pos, this.pos);
  }
}
