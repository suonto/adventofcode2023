import debug from 'debug';
import path from 'node:path';
import { read } from '../util/read';
import { Elf } from './elf';
import { Garden } from './garden';

function inspect(params: { garden: Garden; elfs: Elf[]; steps: number }) {
  const { garden, elfs, steps } = params;
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
        if (distance % 2 === steps % 2) {
          sum++;
        }
      } else if (
        (terrain === 'B' || terrain === 'S') &&
        distance % 2 === steps % 2
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
      if (newClone) {
        clones.push(newClone);
      }
    }
  });

  return clones;
}

async function main(steps: number) {
  const dMain = debug('main');
  const lines = await read(path.join(__dirname, 'mega.txt'));

  const garden = new Garden(lines);

  let elfs = [new Elf({ garden, pos: garden.getStart(), heading: 'up' })];

  let plotsInDiamond = 0;
  for (let i = 0; i < steps; i++) {
    elfs = advance(elfs);
    const step = i + 1;
    const { sum, resultLines } = inspect({ garden, elfs, steps });
    dMain(
      'after step',
      step,
      'reach is',
      sum,
      'clones alive',
      elfs.length,
      `\n${resultLines.join('\n')}`,
    );
    if (step === 131 + 65) {
      dMain('Middle diamond. Sum', sum);
      return;
    }
    if (!elfs.length) {
      dMain(`No more elves alive after ${step} steps. Sad.`);
      plotsInDiamond = sum * 2;
      break;
    }
  }

  const diamondDiameter = 2 * garden.grid.length;
  dMain('diamondDiameter', diamondDiameter);
  const diamondRangeBoundary =
    1 + (steps - garden.grid.length) / diamondDiameter;
  let diamondCount = 1;
  let diamondMultiplier = 2;
  for (let i = 0; i < diamondRangeBoundary; i++) {
    diamondCount += 4 * diamondMultiplier;

    diamondMultiplier++;
  }
  dMain('diamondCount', diamondCount, 'total', diamondCount * plotsInDiamond);
  // 20463656509 too low
  // 304335499601848 too low
}

if (require.main === module) {
  main(26501365);
}
