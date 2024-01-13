import { open } from 'node:fs/promises';
import path from 'node:path';

type Chars = number[];
type Input = {
  chars: Chars;
  focalLength: number | undefined;
};

type Lens = {
  // label is the beginning string of each input before operation
  label: string;
  // focalLength is the operation number
  focalLength: number;
};
type Box = {
  position: number;
  lenses: Lens[];
};

// Lens label, box number
const inventory = new Map<number, Box>();

function parseLine(line: string) {
  const inputs = line.split(',');
  const result: Input[] = [];

  for (const s of inputs) {
    const chars: Chars = [];
    let focalLength: number | undefined = undefined;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '-') {
        break;
      }
      if (s[i] === '=') {
        focalLength = Number.parseInt(s.slice(i + 1));
        break;
      }
      chars.push(s.charCodeAt(i));
    }
    result.push({ chars, focalLength });
  }

  return result;
}

function hashChar(char: number, current: number) {
  return ((current + char) * 17) % 256;
}

function hash(chars: Chars) {
  let result = 0;
  for (const char of chars) {
    result = hashChar(char, result);
  }
  // console.log(
  //   'hash',
  //   chars.map((c) => String.fromCharCode(c)).join(''),
  //   result,
  // );

  return result;
}

function insertLens(box: Box, lens: Lens) {
  const index = box.lenses.map((lens) => lens.label).indexOf(lens.label);
  if (index !== -1) {
    box.lenses.splice(index, 1, lens);
  } else {
    box.lenses.push(lens);
  }
  console.log('insertLens', box.position, box.lenses);
}

function removeLens(box: Box, label: string): boolean {
  const index = box.lenses.map((lens) => lens.label).indexOf(label);
  if (index === -1) {
    console.log('removeLens', false, box.position, label);
    return false;
  }
  box.lenses.splice(index, 1);
  console.log('removeLens', true, box.position, label);
  return true;
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const inputs: Input[] = [];
  for await (const line of file.readLines()) {
    inputs.push(...parseLine(line));
  }

  const boxes: Box[] = [];
  for (let i = 0; i < 256; i++) {
    boxes.push({ position: i, lenses: [] });
  }

  for (const input of inputs) {
    const { chars, focalLength } = input;
    const label: string = chars.map((c) => String.fromCharCode(c)).join('');
    const boxNumber = hash(chars);
    console.log(label, 'at box', boxNumber, focalLength);
    if (focalLength !== undefined) {
      const lens: Lens = {
        label,
        focalLength,
      };
      insertLens(boxes[boxNumber], lens);
    } else {
      removeLens(boxes[boxNumber], label);
    }
  }

  let sum = 0;
  for (const [boxNum, box] of boxes.entries()) {
    for (const [lensNum, lens] of box.lenses.entries()) {
      const power = (1 + boxNum) * (1 + lensNum) * lens.focalLength;
      sum += power;
      console.log(lens.label, power);
    }
  }
  console.log(sum);
})();
