import { open } from 'node:fs/promises';
import path from 'node:path';
import { lcm } from '../util/gcd';

type Point = {
  left: string;
  right: string;
};
function parseLine(line: string): { id: string } & Point {
  const [id, leftRight] = line.split('=').map((s) => s.trim());
  const [left, right] = leftRight
    .split(',')
    .map((s) => s.trim().replace(/\(/g, '').replace(/\)/g, ''));
  return { id, left, right };
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  let sum = 0;
  let instructions: string[] = [];
  const points: Record<string, Point> = {};
  for await (const line of file.readLines()) {
    if (line.includes('=')) {
      const parsed = parseLine(line);
      points[parsed.id] = { left: parsed.left, right: parsed.right };
    } else if (line) {
      instructions = line.split('');
    }
  }
  console.log(points);
  console.log(instructions);

  const starts: string[] = Object.keys(points).filter((k) => k.endsWith('A'));

  const cadences: number[] = [];
  for (const start of starts) {
    let i = 0;
    let current = start;
    while (!current.endsWith('Z')) {
      for (const instruction of instructions) {
        const previous = current;
        if (instruction === 'L') {
          current = points[current].left;
        } else {
          current = points[current].right;
        }
        i++;
        // console.log(previous, instruction, current, i);
      }
    }
    cadences.push(i);
    console.log(start, '->', current, i);

    console.log(cadences.reduce(lcm));
  }
})();
