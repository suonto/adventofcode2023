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

type Limit = {
  min: number;
  max: number;
};

type Limits = {
  a: Limit;
  m: Limit;
  s: Limit;
  x: Limit;
};

type Condition = {
  partType: PartType;
  comparison: Comparison;
  value: number;
};

type NamedCondition = { name: string } & Condition;

type Effect = Outcome | string;

type Workflow = {
  condition?: NamedCondition;
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
            name,
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

function resolveAcceptWorkflows(params: {
  conditions: NamedCondition[];
  workflowName: string;
  workflows: Map<string, Workflow>;
}): NamedCondition[][] {
  const dResolve = debug('resolve');
  const { conditions, workflowName, workflows } = params;
  const newConditionSets: NamedCondition[][] = [];
  const workflow: Workflow = workflows.get(workflowName)!;
  for (const instruction of workflow) {
    if (instruction.effect === 'R') {
      if (!instruction.condition) {
        break;
      }
      conditions.push(invert(instruction.condition));
    } else if (instruction.effect === 'A') {
      if (!instruction.condition) {
        newConditionSets.push([...conditions]);
        break;
      }
      newConditionSets.push([...conditions, { ...instruction.condition }]);
      // dResolve('A', newConditionSets);
      conditions.push(invert(instruction.condition));
    } else {
      newConditionSets.push(
        ...resolveAcceptWorkflows({
          conditions: instruction.condition
            ? [...conditions, { ...instruction.condition }]
            : [...conditions],
          workflowName: instruction.effect,
          workflows,
        }),
      );
      if (instruction.condition) {
        conditions.push(invert(instruction.condition));
      }
    }
  }

  for (const conditionSet of newConditionSets) {
    dResolve(
      workflowName,
      conditionSet.map(
        (c) =>
          `${c.name.padEnd(3, ' ')}:${c.partType}${c.comparison}${c.value
            .toString()
            .padStart(3, ' ')}`,
      ),
    );
  }

  return newConditionSets;
}

function invert(condition: NamedCondition): NamedCondition {
  const result = { ...condition };
  if (result.comparison === '<') {
    // !x<5 -> x>4
    result.comparison = '>';
    result.value--;
  } else {
    // !x>5 -> x<6
    result.comparison = '<';
    result.value++;
  }

  return result;
}

function applyLimits(condition: NamedCondition, limits: Limits): void {
  if (condition.comparison === '<') {
    limits[condition.partType].max = Math.min(
      limits[condition.partType].max,
      condition.value,
    );
  } else {
    limits[condition.partType].min = Math.max(
      limits[condition.partType].min,
      condition.value,
    );
  }
}

function main(_parts: Part[], workflows: Map<string, Workflow>) {
  const dMain = debug('main');
  let sum = 0;

  const rejectConditionSets = resolveAcceptWorkflows({
    conditions: [],
    workflowName: 'in',
    workflows,
  });

  for (const conditionSet of rejectConditionSets) {
    const limits: Limits = {
      a: { min: 0, max: 4001 },
      m: { min: 0, max: 4001 },
      s: { min: 0, max: 4001 },
      x: { min: 0, max: 4001 },
    };
    for (const condition of conditionSet) {
      applyLimits(condition, limits);
    }
    dMain(limits);
    const multipliers = Object.keys(limits).map(
      (k) => limits[k].max - (limits[k].min + 1),
    );
    const result = multipliers.reduce((acc, curr) => acc * curr, 1);
    sum += result;
    dMain('result', result, 'sum', sum);
  }
}

(async () => {
  const { parts, workflows } = await parseInput();
  main(parts, workflows);
})();
