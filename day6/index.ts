import { open } from 'node:fs/promises';
import path from 'node:path';

function parseLine(line: string) {
  const [header, value] = line.split(':').map((x) => x.trim());
  return {
    header,
    value: Number.parseInt(value.replace(/ /g, '')),
  };
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  let timeLimit: number = 0;
  let record: number = 0;
  for await (const line of file.readLines()) {
    console.log(line);
    const parsed = parseLine(line);
    if (parsed.header === 'Time') {
      timeLimit = parsed.value;
    } else if (parsed.header === 'Distance') {
      record = parsed.value;
    }
  }
  console.log(timeLimit);
  console.log(record);

  let speed = 0;
  let firstWinner = 0;
  for (let pressed = 0; pressed < timeLimit; pressed++) {
    const runTime = timeLimit - pressed;
    const distance = speed * runTime;
    // console.log(pressed, 'runs', distance, 'millimeters');
    if (distance > record) {
      if (firstWinner === 0) {
        firstWinner = pressed;
        break;
      }
      // console.log(pressed, 'wins', totalWins);
    }
    speed++;
  }
  console.log('first winner', firstWinner);
  const lastWinner = timeLimit - firstWinner;
  console.log('last winner', lastWinner);
  console.log('race has total wins', lastWinner + 1 - firstWinner);
})();
