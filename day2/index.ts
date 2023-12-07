/* eslint-disable @typescript-eslint/semi */
import { open } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const zGame = z.object({
  blue: z.number().int().lte(14).optional(),
  green: z.number().int().lte(13).optional(),
  red: z.number().int().lte(12).optional(),
});

function parseGame(line: string) {
  const [game, info] = line.split(':', 2);
  const [_, stringId] = game.split(' ');
  const id = Number.parseInt(stringId);

  const sets = info.split(';').map((set) =>
    set.split(',').reduce((acc, grab) => {
      const [count, color] = grab.trim().split(' ');
      acc[color] = Number.parseInt(count);
      return acc;
    }, {}),
  );

  console.log(sets);
  const result = z.array(zGame).safeParse(sets);

  if (!result.success) {
    console.log(result.error);
    return undefined;
  }

  return {
    id,
    sets: result.data,
  };
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  let sum = 0;
  for await (const line of file.readLines()) {
    console.log(line);
    const game = parseGame(line);
    if (game) {
      sum += game.id;
      console.log(sum, JSON.stringify(game));
    }
  }
})();
