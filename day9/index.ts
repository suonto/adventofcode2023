import { open } from 'node:fs/promises';
import path from 'node:path';

function parseLine(line: string) {
  return line.split(' ').map((s) => Number.parseInt(s));
}

class History {
  numbers: number[][] = [];

  constructor(history: number[]) {
    this.numbers.push(history);
    let current = history;
    while (!History.final(current)) {
      current = History.diffs(current);
      this.numbers.push(current);
    }
  }

  predict(): void {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const diff = i < this.numbers.length - 2 ? this.numbers[i + 1][0] : 0;
      this.numbers[i].splice(0, 0, this.numbers[i][0] - diff);
    }
  }

  getNext(): number {
    return this.numbers[0].at(-1)!;
  }

  getPrev(): number {
    return this.numbers[0][0];
  }

  toString(): string {
    const fieldSize = 8;
    const paddingUnit = ' '.repeat(fieldSize);
    let padding = '';
    let result = '';
    for (const set of this.numbers) {
      result +=
        padding +
        set.map((n) => String(n).padStart(fieldSize, ' ')).join(paddingUnit) +
        '\n';
      padding += paddingUnit;
    }
    return result;
  }

  static diffs(numbers: number[]): number[] {
    return numbers.reduce((acc, curr, i) => {
      if (i < numbers.length - 1) {
        acc.push(numbers[i + 1] - curr);
      }
      return acc;
    }, [] as number[]);
  }

  static final(numbers: number[]): boolean {
    for (const number of numbers) {
      if (number !== 0) return false;
    }
    return true;
  }
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  let sum = 0;
  for await (const line of file.readLines()) {
    // console.log(line);
    const parsed = parseLine(line);
    console.log('history');
    const history = new History(parsed);
    console.log(history.toString());
    history.predict();
    console.log('prediction');
    console.log(history.toString());
    sum += history.getPrev();
  }
  console.log(sum);
})();
