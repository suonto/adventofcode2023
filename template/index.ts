import { open } from 'node:fs/promises';
import path from 'node:path';

function parseLine(line: string) {
  // const [game, info] = line.split(':', 2);
  // const [_, stringId] = game.split(' ');
  // const id = Number.parseInt(stringId);
  // const sets = info.split(';').map((set) =>
  //   set.split(',').reduce((acc, grab) => {
  //     const [count, color] = grab.trim().split(' ');
  //     acc[color] = Number.parseInt(count);
  //     return acc;
  //   }, {} as Game),
  // );
  // console.log(sets);
  // const minimum = sets.reduce((acc, set) => {
  //   acc.blue = Math.max(set.blue ?? 0, acc.blue ?? 0);
  //   acc.green = Math.max(set.green ?? 0, acc.green ?? 0);
  //   acc.red = Math.max(set.red ?? 0, acc.red ?? 0);
  //   return acc;
  // }, {} as Game);
  // console.log(minimum);
  // return {
  //   id,
  //   power: (minimum.green ?? 0) * (minimum.blue ?? 0) * (minimum.red ?? 0),
  //   sets,
  // };
  return line;
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  let sum = 0;
  for await (const line of file.readLines()) {
    console.log(line);
    const parsed = parseLine(line);
  }
})();
