import { open } from 'node:fs/promises';
import path from 'node:path';

import { type Direction } from '../util/directions';
import { Point } from '../util/point';

type CityBlock = {
  loss: number;
  min?: {
    total: number;
    from: Direction;
  };
};

type Path = {
  origin: Point;
  location: Point;
  from: Direction;
  to: Direction;
  budget: number;
};

function parseLine(line: string) {
  return line
    .split('')
    .map((c) => ({ loss: Number.parseInt(c) })) as CityBlock[];
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const city: CityBlock[][] = [];
  for await (const line of file.readLines()) {
    city.push(parseLine(line));
  }


  for (const row of city) {
    console.log(row.map((b) => `${b.loss}`).join(''));
  }
})();
