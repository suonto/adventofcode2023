import { open } from 'node:fs/promises';
import path from 'node:path';
import debug from 'debug';

const partTypes = ['x', 'm', 'a', 's'] as const;
type PartType = (typeof partTypes)[number];

const comparisons = ['>', '<'] as const;
type Comparison = (typeof comparisons)[number];

const outcomes = ['A', 'R'] as const;
type Outcome = (typeof outcomes)[number];

function isOutcome(val: string): boolean {
  return outcomes.includes(val as Outcome);
}

type Part = {
  x: number;
  m: number;
  a: number;
  s: number;
};

type Condition = {
  partType: PartType;
  comparison: Comparison;
  value: number;
};

type Effect = Outcome | string;

type Workflow = {
  condition?: Condition;
  effect: Outcome | string;
}[];

function parseWorkflow(line: string): { workflow: Workflow; name: string } {
  const dParseWorkflow = debug('parseWorkflow');
  const [name, rest] = line.slice(0, -1).split('{', 2);

  const rawInstructions = rest.split(',');
  const final = rawInstructions.pop()!;

  dParseWorkflow(rawInstructions);
  return {
    name,
    workflow: [
      ...rawInstructions.map((raw) => {
        const [rawCondition, effect] = raw.split(':');
        dParseWorkflow(rawCondition);
        const comparison: Comparison =
          rawCondition.indexOf('>') !== -1 ? '>' : '<';
        const [partType, value] = rawCondition.split(comparison);
        dParseWorkflow(partType, comparison, value, effect);
        return {
          condition: {
            partType: partType as PartType,
            comparison,
            value: Number.parseInt(value),
          },
          effect,
        };
      }),
      { effect: final },
    ],
  };
}

function parsePart(line: string): Part {
  const rawProps = line
    .slice(1, -1)
    .split(',')
    .map((rawProp) => rawProp.split('=')[1]);
  return {
    x: Number.parseInt(rawProps[0]),
    m: Number.parseInt(rawProps[1]),
    a: Number.parseInt(rawProps[2]),
    s: Number.parseInt(rawProps[3]),
  };
}

async function parseInput() {
  const dParse = debug('parse');
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const lines: string[] = [];
  for await (const line of file.readLines()) {
    lines.push(line);
  }

  const workflows = new Map<string, Workflow>();
  let line = lines.shift();
  while (line) {
    const { name, workflow } = parseWorkflow(line);
    workflows.set(name, workflow);
    line = lines.shift();
  }
  dParse('workflows');
  for (const [name, workflow] of workflows.entries()) {
    dParse(name);
    for (const instruction of workflow) {
      dParse(instruction);
    }
  }

  while (!line) {
    line = lines.shift();
  }

  const parts: Part[] = [];
  while (line) {
    parts.push(parsePart(line));
    line = lines.shift();
  }
  dParse('Parts', parts);

  return { workflows, parts };
}

function satisfies(part: Part, condition: Condition): boolean {
  const { partType, comparison, value } = condition;
  const dSatisfies = debug('satisfies');
  const compare =
    comparison === '<'
      ? (a: number, b: number) => a < b
      : (a: number, b: number) => a > b;
  const result = compare(part[partType], value);
  dSatisfies(part[partType], comparison, value, result);
  return result;
}

function resolve(params: { part: Part; workflow: Workflow }): Effect {
  const dResolve = debug('resolve');
  const { part, workflow } = params;
  for (const instruction of workflow) {
    if (!instruction.condition || satisfies(part, instruction.condition)) {
      dResolve('->', instruction.effect);
      return instruction.effect;
    }
  }
  throw new Error('No condition satisfied, not even final.');
}

function processPart(params: {
  part: Part;
  workflows: Map<string, Workflow>;
}): Outcome {
  const { part, workflows } = params;
  let workflow = workflows.get('in')!;

  let effect: Effect | undefined = undefined;
  while (effect !== 'A' && effect !== 'R') {
    effect = resolve({ part, workflow });
    workflow = workflows.get(effect)!;
  }
  return effect;
}

function main(parts: Part[], workflows: Map<string, Workflow>) {
  const dMain = debug('main');
  let sum = 0;
  for (const [i, part] of parts.entries()) {
    dMain('Processing', i, part);
    const outcome: Outcome = processPart({ part, workflows });
    const result = outcome === 'A' ? part.a + part.m + part.s + part.x : 0;
    sum += result;
    dMain(outcome, result, sum);
  }
}

(async () => {
  const { parts, workflows } = await parseInput();
  main(parts, workflows);
})();
