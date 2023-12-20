import { open } from 'node:fs/promises';
import path from 'node:path';

class Galaxy {
  id: number;
  x: number;
  y: number;

  constructor(id: number, x: number, y: number) {
    this.id = id;
    this.x = x;
    this.y = y;
  }

  distanceTo(other: Galaxy) {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }
}

class Space {
  galaxies: Galaxy[] = [];

  constructor(input: string[][]) {
    for (let y = 0; y < input.length; y++) {
      for (let x = 0; x < input[y].length; x++) {
        if (input[y][x] === '#') {
          this.galaxies.push(new Galaxy(this.galaxies.length + 1, x, y));
        }
      }
    }
  }

  distances() {
    const distances: Record<string, number> = {};
    for (const galaxy of this.galaxies) {
      const others = this.galaxies.filter((other) => galaxy.id !== other.id);
      for (const other of others) {
        const key = [galaxy.id, other.id].sort().join('>');
        if (!distances[key]) {
          distances[key] = galaxy.distanceTo(other);
        }
      }
    }
    return distances;
  }

  at(id: number): Galaxy {
    const result = this.galaxies.find((galaxy) => galaxy.id === id);
    if (!result) {
      throw new Error(`Galaxy ${id} not found`);
    }
    return result;
  }
}

async function parseInput() {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const input: string[][] = [];
  for await (const line of file.readLines()) {
    const row = line.split('');
    input.push(row);
    if (!row.includes('#')) {
      input.push([...row]);
    }
  }

  for (let x = 0; x < input[0].length; x++) {
    const column = input.map((row) => row[x]);
    if (!column.includes('#')) {
      input.forEach((row) => row.splice(x, 0, '.'));
      x++;
    }
  }
  console.log('dimensions', input.length, input[0].length);

  input.map((row) => console.log(row.join('')));
  return new Space(input);
}

(async () => {
  const space = await parseInput();
  const distances = space.distances();
  // ['12', '13'].forEach((key) => console.log(key, distances[key]));
  console.log(space.galaxies.length);
  console.log(
    'pairs mathematically',
    (space.galaxies.length * (space.galaxies.length - 1)) / 2,
  );
  console.log(Object.keys(distances).length);
  // console.log(distances);
  console.log(Object.values(distances).reduce((acc, curr) => acc + curr, 0));
})();
