import { open } from 'node:fs/promises';
import path from 'node:path';

function parseLine(line: string, worths: Record<number, number>) {
  const [game, info] = line.split(':', 2);
  const gameId = Number.parseInt(game.split(' ').filter((x) => x)[1]);
  const [winning, current] = info.split('|').map((side) =>
    side
      .trim()
      .split(' ')
      .filter((x) => x)
      .map((number) => Number.parseInt(number.trim())),
  );
  console.log(current);
  console.log(winning);

  let worth = 1;
  let winningId = gameId;
  for (const number of current) {
    if (winning.includes(number)) {
      winningId++;
      worth += worths[winningId];
    }
  }
  worths[gameId] = worth;
  return { gameId, worth };
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const lines: string[] = [];
  for await (const line of file.readLines()) {
    lines.push(line);
  }
  const reversed = [...lines].reverse();
  const worths: Record<number, number> = {};
  let sum = 0;
  for (const line of reversed) {
    const { gameId, worth } = parseLine(line, worths);
    sum += worth;
    console.log(gameId, worth, sum);
  }
})();
