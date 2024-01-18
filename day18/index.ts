import { open } from 'node:fs/promises';
import path from 'node:path';
import { type Direction, prev, next, directions } from '../util/directions';
import { Point } from '../util/point';
import { debug } from 'debug';

export type Instruction = {
  start: Point;
  end: Point;
  direction: Direction;
  distance: number;
  turn?: 'left' | 'right';
};

type Edge = Point & {
  length: number;
};

function parseLine(line: string, part2: boolean) {
  if (part2) {
    const [, , hex] = line.split(' ');
    const distance = Number.parseInt(hex.slice(2, 7), 16);
    const direction = next(directions[Number.parseInt(hex[7])]);
    const instruction: Omit<Instruction, 'start' | 'end' | 'turn'> = {
      direction,
      distance,
    };
    return instruction;
  } else {
    const [dir, distance] = line.split(' ');
    const direction = (
      {
        U: directions[0],
        R: directions[1],
        D: directions[2],
        L: directions[3],
      } as const
    )[dir]!;
    const instruction: Omit<Instruction, 'start' | 'end' | 'turn'> = {
      direction,
      distance: Number.parseInt(distance),
    };
    return instruction;
  }
}

function diffs(direction: Direction): Point {
  const result = {
    x: 0,
    y: 0,
  };

  if (direction === 'up') result.y--;
  if (direction === 'down') result.y++;
  if (direction === 'right') result.x++;
  if (direction === 'left') result.x--;

  return result;
}

// Not a boundary, end indexes are included
function getEnd(instruction: Omit<Instruction, 'end'>): Point {
  const { x: xDiff, y: yDiff } = diffs(instruction.direction);
  return {
    x: instruction.start.x + xDiff * (instruction.distance - 1),
    y: instruction.start.y + yDiff * (instruction.distance - 1),
  };
}

const main = async () => {
  const dMain = debug('main');
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const instructions: Instruction[] = [];
  let start = { x: 0, y: 0 };
  for await (const line of file.readLines()) {
    const { direction, distance } = { ...parseLine(line, true) };
    const { x: xDiff, y: yDiff } = diffs(direction);
    start = {
      x: start.x + xDiff,
      y: start.y + yDiff,
    };
    const end = getEnd({
      start,
      distance,
      direction,
    });

    const instruction: Instruction = {
      direction,
      distance,
      start,
      end,
    };

    start = end;

    if (instructions.length) {
      if (instructions.at(-1)?.direction === prev(instruction.direction)) {
        instruction.turn = 'right';
      } else {
        instruction.turn = 'left';
      }
    }
    instructions.push(instruction);
  }

  if (instructions.at(-1)?.direction === prev(instructions[0].direction)) {
    instructions[0].turn = 'right';
  } else {
    instructions[0].turn = 'left';
  }

  const edges: Edge[] = [];
  for (const [i, instruction] of instructions.entries()) {
    const nextInstruction = instructions.at(i + 1) ?? instructions[0];
    dMain(
      'Instruction',
      instruction.direction,
      instruction.distance,
      instruction.turn,
      instruction.start,
    );
    if (instruction.direction === 'up') {
      let length = instruction.distance - 1;
      let y = instruction.start.y + 1 - length;
      if (nextInstruction?.turn === 'right') {
        length++;
        y--;
      }
      if (instruction.turn === 'right') {
        length++;
      }
      const edge = {
        x: instruction.start.x,
        y,
        length,
      };
      dMain('up edge', instruction.turn, nextInstruction?.turn, edge);
      edges.push(edge);
    }

    if (instruction.direction === 'down') {
      let length = instruction.distance - 1;
      let y = instruction.start.y;
      if (instruction.turn === 'right') {
        length++;
        y--;
      }
      if (nextInstruction?.turn === 'right') {
        length++;
      }
      const edge = {
        x: instruction.start.x + 1,
        y,
        length,
      };
      dMain('down edge', instruction.turn, nextInstruction?.turn, edge);
      edges.push(edge);
    }
  }

  let sum = 0;

  let sortedEdges = edges.sort((a, b) => a.y - b.y);
  dMain(sortedEdges);

  while (sortedEdges.at(0)) {
    const group = sortedEdges
      .filter((e) => e.y === sortedEdges[0].y)
      .sort((a, b) => a.x - b.x);
    dMain('group', group);

    const left = group[0];
    const right = group[1];
    const nextBetween = Math.min(
      ...sortedEdges
        .filter((e) => e.x > left.x && e.x < right.x)
        .map((e) => e.y),
    );
    const length = Math.min(left.length, right.length, nextBetween - left.y);
    const xStart = Math.min(...edges.map((e) => e.x));
    const xBoundary = Math.max(...edges.map((e) => e.x));

    left.length -= length;
    left.y += length;
    right.length -= length;
    right.y += length;
    const result = length * (right.x - left.x);
    sum += result;
    dMain('result    ', [left, right], result);
    sortedEdges = sortedEdges.filter((e) => e.length).sort((a, b) => a.y - b.y);
  }

  dMain('TOTAL', sum);
};

if (require.main === module) {
  main();
}
