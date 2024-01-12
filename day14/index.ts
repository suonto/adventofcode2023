import { open } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

type Piece = 'O' | '#' | '.';
function parseLine(line: string) {
  return line.split('') as Piece[];
}

const directions = ['north', 'west', 'south', 'east'] as const;
type Direction = (typeof directions)[number];

function next(direction: Direction): Direction {
  return directions[(directions.indexOf(direction) + 1) % directions.length];
}

function sha256(grid: Piece[][]): string {
  const hash = crypto.createHash('sha256');
  hash.update(grid.map((row) => row.join('')).join(''));
  const digest = hash.digest('hex');
  console.log(digest);
  return digest;
}

const cache = new Map<
  string,
  {
    value: number;
    after: number;
  }
>();

function tiltAndRotate(grid: Piece[][], direction: Direction) {
  const newGrid: Piece[][] = [];
  for (let i = 0; i < grid[0].length; i++) {
    newGrid.push(Array(grid.length).fill('.'));
  }
  const result = {
    newGrid,
    direction: next(direction),
  };
  for (let x = 0; x < grid[0].length; x++) {
    let last = 0;
    for (let y = 0; y < grid.length; y++) {
      const piece = grid[y][x];
      if (piece === '#') {
        last = y + 1;
        result.newGrid[x][grid.length - (y + 1)] = piece;
      }
      if (piece === 'O') {
        result.newGrid[x][grid.length - (y + 1)] = '.';
        result.newGrid[x][grid.length - (last + 1)] = 'O';
        last++;
      }
    }
  }
  return result;
}

function northWeight(grid: Piece[][]): number {
  let result = 0;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x] === 'O') {
        result += grid.length - y;
      }
    }
  }
  return result;
}

function cycle(grid: Piece[][], direction: Direction) {
  let result = tiltAndRotate(grid, direction);
  result = tiltAndRotate(result.newGrid, result.direction);
  result = tiltAndRotate(result.newGrid, result.direction);
  return tiltAndRotate(result.newGrid, result.direction);
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const grid: Piece[][] = [];
  for await (const line of file.readLines()) {
    grid.push(parseLine(line));
  }

  console.log('original');
  for (const row of grid) {
    console.log(row.join(''));
  }

  console.log('test', northWeight(grid));

  console.log();

  let params = [grid, 'north' as Direction] as const;
  let fullCycleStart: number | undefined;
  let fullCycleLength = 0;
  let repeatingWeights: number[] = [];
  for (let i = 0; i < 1000000000; i++) {
    if (
      fullCycleStart !== undefined &&
      fullCycleLength &&
      repeatingWeights.length === fullCycleLength
    ) {
      const index = (i + 1 - fullCycleStart) % fullCycleLength;
      console.log(
        'repeating weights',
        repeatingWeights,
        'after',
        'cycled',
        i + 1,
        'times',
        'means index',
        index,
        'weight',
        repeatingWeights.at(index),
      );
      i = 1000000000 - 1;
      const finalIndex = (i + 1 - fullCycleStart) % fullCycleLength;
      console.log(
        'ultimately',
        'after',
        'cycled',
        i + 1,
        'times',
        'means index',
        finalIndex,
        'weight',
        repeatingWeights.at(finalIndex),
      );
      break;
    }
    const { newGrid, direction } = cycle(...params);
    params = [newGrid, direction];
    const weight = northWeight(newGrid);
    console.log(
      'cycled',
      i + 1,
      'times',
      direction,
      'facing up',
      'northWeight',
      weight,
    );
    for (const row of newGrid) {
      console.log(row.join(''));
    }
    const hash = sha256(newGrid);
    const cached = cache.get(hash);
    if (cached) {
      console.log(
        `encountered hash again after cycling ${
          i + 1
        } times, first encountered after cycling ${cached.after} times`,
      );
      if (!fullCycleStart) {
        fullCycleStart = cached.after;
      }
      if (!fullCycleLength) {
        fullCycleLength = i + 1 - cached.after;
      }
      if (repeatingWeights.length < fullCycleLength) {
        repeatingWeights.push(weight);
      }
    } else {
      cache.set(hash, { after: i + 1, value: weight });
    }

    console.log();
  }
})();
