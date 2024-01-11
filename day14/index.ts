import { open } from 'node:fs/promises';
import path from 'node:path';

type Piece = 'O' | '#' | '.';
function parseLine(line: string) {
  return line.split('') as Piece[];
}

function flip(grid: Piece[][]): Piece[][] {
  const result: Piece[][] = [];
  for (let i = 0; i < grid[0].length; i++) {
    const row: Piece[] = [];
    for (let j = 0; j < grid.length; j++) {
      row.push(grid[j][i]);
    }
    result.push(row);
  }
  return result;
}

function tilt(grid: Piece[][]): number {
  let sum = 0;
  for (const [y, row] of grid.entries()) {
    for (const [x, piece] of row.entries()) {
      if (piece === 'O') {
        const last = Math.max(
          grid[y].slice(0, x).lastIndexOf('O'),
          grid[y].slice(0, x).lastIndexOf('#'),
        );
        grid[y][x] = '.';
        grid[y][last + 1] = 'O';
        sum += row.length - (last + 1);
      }
    }
  }
  return sum;
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const grid: Piece[][] = [];
  for await (const line of file.readLines()) {
    grid.push(parseLine(line));
  }

  for (const row of grid) {
    console.log(row.join(''));
  }
  console.log();
  console.log('flipped');

  const flipped = flip(grid);
  for (const row of flipped) {
    console.log(row.join(''));
  }
  console.log();
  const sum = tilt(flipped);
  console.log('tilted');
  for (const row of flipped) {
    console.log(row.join(''));
  }

  const aligned = flip(flipped);
  console.log();
  console.log('aligned');
  for (const row of aligned) {
    console.log(row.join(''));
  }

  console.log(sum);
})();
