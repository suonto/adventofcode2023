import { open } from 'node:fs/promises';
import path from 'node:path';

function parseLine(line: string) {
  const [header, times] = line.split(':').map((x) => x.trim());
  return {
    header,
    times: times
      .split(' ')
      .filter((x) => x)
      .map((x) => Number.parseInt(x)),
  };
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  let timeLimits: number[] = [];
  let records: number[] = [];
  for await (const line of file.readLines()) {
    console.log(line);
    const parsed = parseLine(line);
    if (parsed.header === 'Time') {
      timeLimits = parsed.times;
    } else if (parsed.header === 'Distance') {
      records = parsed.times;
    }
  }
  console.log(timeLimits);
  console.log(records);

  let totalWins = 1;
  for (let i = 0; i < timeLimits.length; i++) {
    const timeLimit = timeLimits[i];
    const record = records[i];
    let speed = 0;
    let totalRaceWins = 0;
    for (let pressed = 0; pressed < timeLimit; pressed++) {
      const runTime = timeLimit - pressed;
      const distance = speed * runTime;
      if (speed >= timeLimits[timeLimit]) {
        break;
      }
      console.log(pressed, 'runs', distance, 'millimeters');
      if (distance > record) {
        totalRaceWins++;
        console.log(pressed, 'wins', totalRaceWins);
      }
      speed++;
    }
    totalWins *= totalRaceWins;
    console.log(
      'race',
      i,
      'has',
      totalRaceWins,
      'wins',
      'total wins',
      totalWins,
    );
  }
  console.log(totalWins);
})();
