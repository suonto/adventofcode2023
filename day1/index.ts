import { open } from 'node:fs/promises';
import path from 'node:path';

const map = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9'
};

(async () => {
    const file = await open(path.join(__dirname, '.', 'input.txt'));
  
    let sum = 0;
    for await (const line of file.readLines()) {
      console.log(line);
      const pattern = new RegExp(`\\d{1}|(${Object.keys(map).join('|')})`, 'g');
      const match = line.match(pattern);
      console.log('match', match)
      const first = map[match.at(0)] ?? match.at(0);
      const last = map[match.at(-1)] ?? match.at(-1);

      const result = `${first}${last}`;
      sum += Number.parseInt(result);
      console.log(result, sum)

    }
  })();