import { samePoint } from '../util/point';
import { read } from '../util/read';
import { Elf } from './elf';
import { Garden } from './garden';

async function main(steps: number) {
  const lines = await read('input.txt');

  const garden = new Garden(lines);

  let elfs = [new Elf({ garden, path: [], heading: 'up' })];

  for (let i = 0; i < steps; i++) {
    const clones: Elf[] = [];
    elfs.forEach((elf) => {
      const newClones = elf.spawnClones().map((c) => c.step());
      for (const newClone of newClones) {
        if (
          newClone &&
          // max one new elf per garden block please
          !clones.find((c) => samePoint(c.pos(), newClone.pos()))
        ) {
          clones.push(newClone);
        }
      }
    });

    elfs = clones;
  }
}

if (require.main === module) {
  main(1);
}
