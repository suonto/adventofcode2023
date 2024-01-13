import { randomUUID } from 'node:crypto';
import { open } from 'node:fs/promises';
import path from 'node:path';

const directions = ['up', 'right', 'down', 'left'] as const;
type Direction = (typeof directions)[number];

function next(direction: Direction): Direction {
  return directions[(directions.indexOf(direction) + 1) % directions.length];
}

function prev(direction: Direction): Direction {
  return directions[(directions.indexOf(direction) + 3) % directions.length];
}

function opposite(direction: Direction): Direction {
  return next(next(direction));
}

const mirrors = ['/', '\\'] as const;
type Mirror = (typeof mirrors)[number];

const splitters = ['|', '-'] as const;
type Splitter = (typeof splitters)[number];

type Content = '.' | Mirror | Splitter;

type Tile = {
  content: Content;
  /**
   * energizedBy is an array of Directions.
   * From which directions have Beams arrived into this tile.
   * */
  arrivals: Direction[];
};

type Point = { x: number; y: number };

type Beam = Point & {
  direction: Direction;
};

function inGrid(point: Point, grid: Tile[][]) {
  const { x, y } = point;
  return x >= 0 && x < grid[0].length && y >= 0 && y < grid.length;
}

function move(beam: Beam, grid: Tile[][]): boolean {
  if (beam.direction === 'up') beam.y -= 1;
  if (beam.direction === 'right') beam.x += 1;
  if (beam.direction === 'down') beam.y += 1;
  if (beam.direction === 'left') beam.x -= 1;

  if (!inGrid(beam, grid)) {
    return false;
  }

  const tile = grid[beam.y][beam.x];
  const arrivesFrom = opposite(beam.direction);

  if (tile.arrivals.includes(arrivesFrom)) {
    // beam journey is complete
    return false;
  }

  tile.arrivals.push(arrivesFrom);
  return true;
}

function turn(beam: Beam, mirror: Mirror) {
  if (mirror === '/') {
    if (['up', 'down'].includes(beam.direction)) {
      beam.direction = next(beam.direction);
    } else {
      beam.direction = prev(beam.direction);
    }
  } else {
    if (['up', 'down'].includes(beam.direction)) {
      beam.direction = prev(beam.direction);
    } else {
      beam.direction = next(beam.direction);
    }
  }
}

function split(beam: Beam, splitter: Splitter): Beam[] {
  if (
    (splitter === '-' && ['up', 'down'].includes(beam.direction)) ||
    (splitter === '|' && ['left', 'right'].includes(beam.direction))
  ) {
    const left: Beam = {
      x: beam.x,
      y: beam.y,
      direction: prev(beam.direction),
    };
    const right: Beam = {
      x: beam.x,
      y: beam.y,
      direction: next(beam.direction),
    };
    return [left, right];
  }

  return [beam];
}

function advance(beam: Beam, grid: Tile[][]): Beam[] {
  if (!move(beam, grid)) {
    return [];
  }

  const tile = grid[beam.y][beam.x];
  if (mirrors.includes(tile.content as Mirror)) {
    turn(beam, tile.content as Mirror);
    return [beam];
  }

  if (splitters.includes(tile.content as Splitter)) {
    return split(beam, tile.content as Splitter);
  }

  return [beam];
}

function parseLine(line: string) {
  return line.split('') as Content[];
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const grid: Tile[][] = [];
  for await (const line of file.readLines()) {
    console.log(line);
    const contents = parseLine(line);
    grid.push(contents.map((content) => ({ content, arrivals: [] })));
  }
  console.log();

  const beams: Beam[] = [];
  let beam: Beam | undefined = {
    x: -1,
    y: 0,
    direction: 'right',
  };

  while (beam) {
    beams.push(...advance(beam, grid));
    beam = beams.shift();
  }

  let energized = 0;
  for (const row of grid) {
    const print = row.map((r) => (r.arrivals.length ? '#' : '.'));
    energized += row.reduce((acc, curr) => {
      acc = curr.arrivals.length ? acc + 1 : acc;
      return acc;
    }, 0);
    console.log(row.map((r) => (r.arrivals.length ? '#' : '.')).join(''));
  }
  console.log(energized);
})();
