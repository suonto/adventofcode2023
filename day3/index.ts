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

type Symbol = {
  value: string;
  vertical: number;
  horizontal: number;
};

function parseLine(line: string, lineNumber: number) {
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
          right: cPos,
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

  return numbers;
}

function parseSymbols(line: string, lineNumber: number) {
  const symbols: Symbol[] = [];
  let cPos = 0;
  for (const c of line) {
    if (!(c in digits) && c !== '.') {
      symbols.push({
        value: c,
        horizontal: cPos,
        vertical: lineNumber,
      });
    }
    cPos++;
  }

  return symbols;
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const lines: string[] = [];
  for await (const line of file.readLines()) {
    lines.push(line);
  }
  let lineNumber = 0;
  const numbers: Number[] = [];
  for (const line of lines) {
    console.log(line);
    const newNumbers = parseLine(line, lineNumber);
    console.log(newNumbers);
    numbers.push(...newNumbers);
    lineNumber++;
  }

  lineNumber = 0;
  const symbols: Symbol[] = [];
  for (const line of lines) {
    console.log(line);
    const newSymbols = parseSymbols(line, lineNumber);
    symbols.push(...newSymbols);
    console.log(newSymbols);
    lineNumber++;
  }

  let sum = 0;
  for (const symbol of symbols.filter((symbol) => symbol.value === '*')) {
    let count = 0;
    let members: number[] = [];
    for (const number of numbers) {
      if (
        number.left <= symbol.horizontal &&
        number.right >= symbol.horizontal &&
        number.top <= symbol.vertical &&
        number.bottom >= symbol.vertical
      ) {
        members.push(number.value);
        count += 1;
      }
    }
    if (count == 2) {
      const product = members[0] * members[1];
      sum += product;
      console.log(product, sum);
    }
  }
  // for (const number of numbers.filter((number) => number.active)) {
  //   sum += number.value;
  //   console.log(number.value, sum);
  // }
})();
