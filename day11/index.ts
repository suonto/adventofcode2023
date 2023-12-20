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
  input: string[][] = [];
  expansionRatio: number = 1;

  constructor(input: string[][], expansionRatio: number) {
    this.input = input;
    this.expansionRatio = expansionRatio;
  }

  xOffset(atX: number) {
    let offset = 0;
    for (let x = 0; x < atX; x++) {
      const column = this.input.map((row) => row[x]);
      if (!column.includes('#')) {
        offset += this.expansionRatio - 1;
      }
    }
    return offset;
  }

  yOffset(atY: number) {
    let offset = 0;
    for (let y = 0; y < atY; y++) {
      const row = this.input[y];
      if (!row.includes('#')) {
        offset += this.expansionRatio - 1;
      }
    }
    return offset;
  }

  add(x: number, y: number) {
    this.galaxies.push(new Galaxy(this.galaxies.length + 1, x, y));
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

async function parseInput(expansionRatio: number) {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const input: string[][] = [];
  for await (const line of file.readLines()) {
    input.push(line.split(''));
  }
  const space = new Space(input, expansionRatio);

  const xOffsets: Record<number, number> = {};
  for (let y = 0; y < input.length; y++) {
    const yOffset = space.yOffset(y);
    for (let x = 0; x < input[y].length; x++) {
      const xOffset = xOffsets[x] ?? space.xOffset(x);
      if (input[y][x] === '#') space.add(x + xOffset, y + yOffset);
    }
  }

  return space;
}

(async () => {
  const space = await parseInput(1000000);
  const distances = space.distances();
  console.log(space.galaxies.length);
  console.log(
    'pairs mathematically',
    (space.galaxies.length * (space.galaxies.length - 1)) / 2,
  );
  console.log(Object.keys(distances).length);
  console.log(Object.values(distances).reduce((acc, curr) => acc + curr, 0));
})();
