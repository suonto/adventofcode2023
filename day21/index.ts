import debug from 'debug';
import path from 'node:path';
import { read } from '../util/read';
import { Elf } from './elf';
import { Garden } from './garden';

function inspect(params: { garden: Garden; elfs: Elf[]; step: number }) {
  const { garden, elfs, step } = params;
  let sum = 0;
  const resultLines: string[] = [];
  const start = garden.getStart();
  for (let y = 0; y < garden.grid.length; y++) {
    let row = '';
    for (let x = 0; x < garden.grid.length; x++) {
      const distance = Math.abs(y - start.y) + Math.abs(x - start.x);
      const terrain = garden.getTerrain({ x, y });
      if (elfs.find((e) => e.occupies({ x, y }))) {
        row += 'E';
        sum++;
      } else if (
        (terrain === 'B' || terrain === 'S') &&
        distance % 2 === step % 2
      ) {
        row += 'O';
        sum++;
      } else {
        row += terrain === 'B' ? '.' : terrain;
      }
    }
    resultLines.push(row);
  }

  return { sum, resultLines };
}

function advance(elfs: Elf[]) {
  const clones: Elf[] = [];
  elfs.forEach((elf) => {
    const newClones: Elf[] = elf
      .spawnClones()
      .map((c) => c.step())
      .filter((c) => c) as Elf[];
    for (const newClone of newClones) {
      if (
        newClone &&
        // max one new elf per garden block please
        !clones.find((c) => c.occupies(newClone.pos()))
      ) {
        clones.push(newClone);
      }
    }
  });

  return clones;
}

async function main(steps: number) {
  const dMain = debug('main');
  const lines = await read(path.join(__dirname, 'input.txt'));

  const garden = new Garden(lines);

  let elfs = [new Elf({ garden, path: [], heading: 'up' })];

  for (let i = 0; i < steps; i++) {
    elfs = advance(elfs);
    const { sum, resultLines } = inspect({ garden, elfs, step: i });
    dMain(
      'after step',
      i + 1,
      'reach is',
      sum,
      'clones alive',
      elfs.length,
      `\n${resultLines.join('\n')}`,
    );
    if (!elfs.length)
      throw new Error(`No more elves alive after ${i + 1} steps. Sad.`);
  }
}

if (require.main === module) {
  main(265);
}
