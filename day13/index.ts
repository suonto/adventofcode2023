import { open } from 'node:fs/promises';
import path from 'node:path';
import debug from 'debug';

function parseLine(line: string) {
  if (!line) {
    return undefined;
  }
  return line.split('');
}

/**
 * Diff score between two arrays of strings.
 */
function diffScore(a: string[], b: string[]): number {
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      result++;
    }
    if (result > 1) {
      break;
    }
  }
  return result;
}

function flip(grid: string[][]): string[][] {
  const result: string[][] = [];
  for (let i = 0; i < grid[0].length; i++) {
    const row: string[] = [];
    for (let j = 0; j < grid.length; j++) {
      row.push(grid[j][i]);
    }
    result.push(row);
  }
  return result;
}

function hasMirrorAt(i: number, grid: string[][]): boolean {
  let before = i - 1;
  let after = i;
  let budget = 1;
  while (before >= 0 && after < grid.length) {
    budget -= diffScore(grid[before--], grid[after++]);
    if (budget < 0) {
      return false;
    }
  }
  return budget === 0;
}

function mirrorAt(grid: string[][]): number | undefined {
  for (let i = 1; i < grid.length; i++) {
    if (hasMirrorAt(i, grid)) {
      return i;
    }
  }
  return undefined;
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const grids: string[][][] = [];
  let grid: string[][] = [];
  for await (const line of file.readLines()) {
    const parsed = parseLine(line);
    if (parsed) {
      grid.push(parsed);
    } else {
      grids.push(grid);
      grid = [];
    }
  }
  grids.push(grid);

  let result = 0;
  for (grid of grids) {
    const vertical = mirrorAt(grid);
    for (const row of grid) {
      console.log(row.join(''));
    }
    console.log('vertical', vertical);

    const horizontal = mirrorAt(flip(grid));
    for (const row of flip(grid)) {
      console.log(row.join(''));
    }
    console.log('horizontal', horizontal);

    if (!vertical && !horizontal) {
      throw new Error('no mirror');
    }

    result += (mirrorAt(grid) ?? 0) * 100;
    result += mirrorAt(flip(grid)) ?? 0;

    console.log('result', result);
    console.log();
  }
})();
