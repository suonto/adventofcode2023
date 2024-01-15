import { open } from 'node:fs/promises';
import path from 'node:path';
import { type Direction, directions } from '../util/directions';
import { Point } from '../util/point';
import debug from 'debug';

type Instruction = {
  color: string;
  direction: Direction;
  distance: number;
};

const dirs: Record<string, Direction> = {
  U: 'up',
  R: 'right',
  D: 'down',
  L: 'left',
};

type Block = {
  content: '.' | '#' | 'O' | 'I';
  paint?: {
    side: Direction;
    color: string;
  };
};

function parseLine(line: string) {
  const [direction, distance, rgb] = line.split(' ');
  const instruction: Instruction = {
    direction: dirs[direction],
    distance: Number.parseInt(distance),
    color: rgb.slice(1, -1),
  };
  return instruction;
}

function extend(params: { grid: Block[][]; point: Point }): Point {
  const dExtend = debug('extend');
  const { grid, point } = params;
  dExtend('before', point);
  // print(grid);

  if (point.y === grid.length) {
    const newRow: Block[] = [];
    for (let i = 0; i < grid[0].length; i++) {
      newRow.push({ content: '.' });
    }
    grid.push(newRow);
  }

  if (point.y === -1) {
    const newRow: Block[] = [];
    for (let i = 0; i < grid[0].length; i++) {
      newRow.push({ content: '.' });
    }
    grid.unshift(newRow);
    point.y = 0;
  }

  if (point.x === grid[0].length) {
    for (const row of grid) {
      row.push({ content: '.' });
    }
  }

  if (point.x === -1) {
    for (const row of grid) {
      row.unshift({ content: '.' });
    }
    point.x = 0;
  }

  dExtend('after', point);
  // print(grid);
  return point;
}

function diffs(direction: Direction): Point {
  const result = {
    x: 0,
    y: 0,
  };

  if (direction === 'up') result.y--;
  if (direction === 'down') result.y++;
  if (direction === 'right') result.x++;
  if (direction === 'left') result.x--;

  return result;
}

function infect(params: { grid: Block[][]; point: Point }): Point[] {
  const dInfect = debug('infect');
  const { grid, point } = params;
  dInfect('infect', point);
  grid[point.y][point.x].content = 'O';

  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 },
  ].filter(
    (neighbor) =>
      neighbor.x >= 0 &&
      neighbor.y >= 0 &&
      neighbor.x < grid[0].length &&
      neighbor.y < grid.length &&
      grid[neighbor.y][neighbor.x].content === '.',
  );
}

function print(grid: Block[][]) {
  for (const row of grid) {
    console.log(row.map((r) => r.content).join(''));
  }
  console.log();
}

function digTrench(params: {
  start: Point;
  grid: Block[][];
  instruction: Instruction;
}): Point {
  const { start, grid, instruction } = params;
  let point = start;
  const { x: xDiff, y: yDiff } = diffs(instruction.direction);

  for (let d = 0; d < instruction.distance; d++) {
    point = { x: point.x + xDiff, y: point.y + yDiff };
    point = extend({ grid, point });
    grid[point.y][point.x].content = '#';
  }

  return point;
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  let start = { x: 0, y: 0 };
  const grid: Block[][] = [[{ content: '#' }]];
  for await (const line of file.readLines()) {
    console.log(line);
    const instruction = parseLine(line);
    start = digTrench({
      start,
      grid,
      instruction,
    });
  }
  print(grid);

  extend({ grid, point: { x: -1, y: -1 } });
  extend({ grid, point: { x: grid[0].length, y: grid.length } });
  print(grid);

  for (const [y, row] of grid.entries()) {
    const trenchIndex = row.findIndex((b) => b.content === '#');
    if (trenchIndex > 0) {
      const points = [{ x: trenchIndex - 1, y }];
      while (points.length) {
        const point = points.shift()!;
        const newPoints = infect({
          grid,
          point,
        });
        points.unshift(...newPoints);
      }
      break;
    }
  }

  let sum = 0;
  for (const row of grid) {
    for (const block of row) {
      if (block.content === '.') {
        block.content = 'I';
      }
      if (['I', '#'].includes(block.content)) {
        sum++;
      }
    }
  }

  print(grid);
  console.log(sum);
})();
