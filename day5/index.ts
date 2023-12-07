import { open } from 'node:fs/promises';
import path from 'node:path';

function parseLine(line: string) {
  const [dest, src, len] = line
    .split(' ', 3)
    .map((x) => Number.parseInt(x.trim()));

  return { dest, src, len };
}

function findVal(number: number, ranges: Range[]): number {
  for (const range of ranges) {
    if (number >= range.src && number < range.src + range.len) {
      return range.dest + (number - range.src);
    }
  }
  return number;
}

type Spec = {
  prev: string;
  dest: string;
  ranges: Range[];
};

type Range = ReturnType<typeof parseLine>;

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  let maps: Record<string, Spec> = {};
  let seeds: number[] = [];
  let src = '';
  let dest = '';
  let header = '';
  for await (const line of file.readLines()) {
    // console.log('line', line)
    if (line.startsWith('seeds:')) {
      seeds = line
        .split(':')[1]
        .trim()
        .split(' ')
        .map((x) => Number.parseInt(x.trim()));
      continue;
    }
    if (line.includes('map:')) {
      const prev = header.split('-')[0];
      header = line.split(' ')[0];
      [src, , dest] = header.split('-', 3);
      maps[src] = {
        prev,
        dest,
        ranges: [],
      };
      continue;
    } else if (!line) continue;
    // console.log(line, maps)
    maps[src].ranges.push(parseLine(line));
  }
  console.log('seeds', seeds);
  console.log(maps);

  let min = Number.MAX_SAFE_INTEGER - 1;
  for (const seed of seeds) {
    let src = 'seed';
    let val = seed;
    while (src in maps) {
      val = findVal(val, maps[src].ranges);
      src = maps[src].dest;
      // console.log(src, val);
    }
    console.log(val, min);
    min = Math.min(val, min);
    console.log('seed', seed, 'location', val, 'min', min);
  }
})();
