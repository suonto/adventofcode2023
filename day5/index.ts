import { open } from 'node:fs/promises';
import path from 'node:path';
import debug from 'debug';
import { Range } from './range';

// error to stderr
const dError = debug('error');

// others to stdout
debug.log = console.info.bind(console);

function parseLine(line: string) {
  const [dest, start, length] = line
    .split(' ', 3)
    .map((x) => Number.parseInt(x.trim()));

  return new Range({
    start,
    length,
    boundary: start + length,
    offset: dest - start,
  });
}

function mapVal(spec: Spec, number: number): number {
  const dMapVal = debug('map');
  for (const range of spec.ranges) {
    if (range.contains(number)) {
      const result = number + range.offset;
      dMapVal(range, number, result);
      return result;
    }
  }
  return number;
}

type Spec = {
  dest: string;
  ranges: Range[];
};

function specLength(spec: Spec) {
  return spec.ranges.reduce((acc, curr) => acc + curr.length, 0);
}

/**
 * Result
 *   - parent range, parent offset for those parentSpec ranges whose effective range does not overlap with childSpec ranges
 *   - parent range, both offsets for parentSpec ranges where effective range overlaps with childSpec ranges
 *   - child  range, child offset for those childSpec ranges that do not overlap with parentSpec ranges or parentSpec effective ranges
 * remember to sort according to src
 */
function mergeSpec(parentSpec: Spec, childSpec: Spec) {
  const dMerge = debug('merge');
  const parentLength = specLength(parentSpec);
  const childLength = specLength(childSpec);
  dMerge(
    'parent',
    parentSpec.dest,
    specLength(parentSpec),
    specLength(childSpec),
  );
  const result: Spec = {
    dest: childSpec.dest,
    ranges: [],
  };

  // Collect parent ranges
  const candidates: Range[] = [...parentSpec.ranges];
  while (candidates.length) {
    const candidatesLength = candidates.reduce(
      (acc, curr) => acc + curr.length,
      0,
    );
    let parentRange = candidates.shift()!;

    let match = false;
    for (const childRange of childSpec.ranges) {
      const { left, both, right } = parentRange.overlap(childRange);
      if (left && right && both) {
        match = true;
        candidates.push(left);
        candidates.push(right);
        result.ranges.push(both);
      }
      if (left && both && !right) {
        match = true;
        candidates.push(left);
        result.ranges.push(both);
      }
      if (both && !left && !right) {
        match = true;
        result.ranges.push(both);
      }
      if (!left && both && right) {
        match = true;
        candidates.push(right);
        result.ranges.push(both);
      }
      if (match) break;
    }
    if (!match) {
      const newRange = parentRange.copy('parent.no-match');
      result.ranges.push(newRange);
    }
  }

  const resultLength = specLength(result);
  if (resultLength !== parentLength) {
    dError(
      'Invalid parent collection result length',
      parentLength,
      resultLength,
      parentSpec.ranges,
      childSpec.ranges,
      result,
    );
    throw new Error('Invalid parent collection result length');
  }
  // Collect child ranges
  const childCandidates = [...childSpec.ranges];
  while (childCandidates.length) {
    const childRange = childCandidates.shift()!;

    let match = false;
    for (const parentRange of [...parentSpec.ranges]) {
      const { left, between, right } = childRange.extract(parentRange);
      if (between && between.length < childRange.length) {
        childCandidates.push(between);
        match = true;
      }
      if (left && left.length < childRange.length) {
        childCandidates.push(left);
        match = true;
      }
      if (right && right.length < childRange.length) {
        childCandidates.push(right);
        match = true;
      }
      // child range is fully contained in the union of parent range and parent effective range
      if (!left && !between && !right) {
        match = true;
      }
      if (match) break;
    }
    if (!match) {
      result.ranges.push(childRange.copy('child.no-match'));
    }
  }

  result.ranges.sort((a, b) => a.start - b.start);
  return result;
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const init: Spec = {
    dest: 'seed',
    ranges: [],
  };
  let maps: Record<string, Spec> = {
    init,
  };
  let src = '';
  let dest = '';
  let header = '';
  const dParse = debug('parse');
  for await (const line of file.readLines()) {
    dParse('line', line);
    if (line.startsWith('seeds:')) {
      const seedsArr = line
        .split(':')[1]
        .trim()
        .split(' ')
        .map((x) => Number.parseInt(x.trim()));

      // Get pairs of 2 from seedsArr as a new Range
      for (let i = 0; i < seedsArr.length; i += 2) {
        const start = seedsArr[i];
        const length = seedsArr[i + 1];
        init.ranges.push(
          new Range({ start, length, boundary: start + length, offset: 0 }),
        );
      }
      init.ranges.sort((a, b) => a.start - b.start);
      continue;
    }
    if (line.includes('map:')) {
      const prev = header.split('-')[0];
      header = line.split(' ')[0];
      [src, , dest] = header.split('-', 3);
      maps[src] = {
        dest,
        ranges: [],
      };
      continue;
    } else if (!line) continue;

    const shift = parseLine(line);
    maps[src].ranges.push(shift);
    // ranges array is sorted based on range src
    maps[src].ranges.sort((a, b) => a.start - b.start);
  }

  const dProcess = debug('process:log');
  const dResults = debug('process:results');
  dProcess('init', init.ranges);
  dProcess(maps);

  const params = [
    'soil',
    'fertilizer',
    'water',
    'light',
    'temperature',
    'humidity',
  ];

  const final = params.reduce((acc, curr) => {
    acc = mergeSpec(acc, maps[curr]);
    dProcess('seed-to', acc.dest, acc.ranges);
    dResults('seed 82', acc.dest, mapVal(acc, 82));
    return acc;
  }, maps['seed']);

  dProcess('final', final.ranges);

  const minLocation = maps['init'].ranges.reduce((acc, curr) => {
    const min = curr.min(final.ranges);
    acc = Math.min(acc, min);

    return acc;
  }, Number.MAX_SAFE_INTEGER);

  dResults('min location', minLocation);
})();
