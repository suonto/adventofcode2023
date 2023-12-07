import { open } from 'node:fs/promises';
import path from 'node:path';

const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

type Number = {
  value: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  active: boolean;
};

function parseLine(line: string, lineNumber: number) {
  const pattern = /\d+/g;
  const numbers: Number[] = [];
  let number = '';
  let left = -2;
  let top = -2;
  let right = -2;
  let bottom = -2;
  let cPos = 0;
  for (const c of line) {
    if (c in digits) {
      if (!number) {
        left = cPos - 1;
        top = lineNumber - 1;
      }
      number = `${number}${c}`;
    } else {
      if (number) {
        numbers.push({
          value: Number.parseInt(number),
          left,
          top,
          right: cPos + 1,
          bottom: lineNumber + 1,
          active: false,
        });
      }
      number = '';
      left = -2;
      top = -2;
      right = -2;
      bottom = -2;
    }
    cPos++;
  }

  return numbers;
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  let lineNumber = 0;
  for await (const line of file.readLines()) {
    console.log(line);
    const parsed = parseLine(line, lineNumber);
    console.log(parsed);
    lineNumber++;
  }
})();
