import { open } from 'node:fs/promises';
import path from 'node:path';

type Piece = 'O' | '#' | '.';
function parseLine(line: string) {
  return line.split('') as Piece[];
}

const directions = ['north', 'west', 'south', 'east'] as const;
type Direction = (typeof directions)[number];

function next(direction: Direction): Direction {
  return directions[(directions.indexOf(direction) + 1) % directions.length];
}

function tiltAndRotate(grid: Piece[][], direction: Direction) {
  const newGrid: Piece[][] = [];
  for (let i = 0; i < grid[0].length; i++) {
    newGrid.push(Array(grid.length).fill('.'));
  }
  const result = {
    newGrid,
    weight: 0,
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
        result.weight += grid.length - last;

        result.newGrid[x][grid.length - (y + 1)] = '.';
        result.newGrid[x][grid.length - (last + 1)] = 'O';
        last++;
      }
    }
  }
  return result;
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

  console.log();

  const { newGrid, weight, direction } = tiltAndRotate(grid, 'north');
  console.log('tiltedAndRotated', direction, 'facing up', weight);
  for (const row of newGrid) {
    console.log(row.join(''));
  }
  console.log();
})();
