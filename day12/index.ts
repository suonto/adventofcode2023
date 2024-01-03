import { open } from 'node:fs/promises';
import path from 'node:path';
import debug from 'debug';

const dError = debug('error');

type Spring = '#' | '.';
type SpringUnknown = Spring | '?';

type Shifter = {
  length: number;
  position: number;
};

let cache = new Map<string, number>();

class DancePlatform {
  shifters: Shifter[] = [];
  slots: SpringUnknown[];
  lengths: number[];
  validator: number[];
  firstAtConstraint: number | undefined;

  constructor(params: {
    slots: SpringUnknown[];
    lengths: number[];
    validator: number[];
    firstAt?: number;
  }) {
    const dConstructor = debug('constructor');
    this.slots = params.slots;
    this.lengths = params.lengths;
    this.validator = params.validator;
    this.firstAtConstraint = params.firstAt;
    dConstructor(
      this.firstAtConstraint
        ? this.slots.slice(0, this.firstAtConstraint).join('')
        : '',
      this.slots.slice(this.firstAtConstraint ?? 0).join(''),
      'lengths',
      params.lengths,
      'firstAt',
      params?.firstAt ?? 0,
    );

    if (this.addShifters(params.firstAt ?? 0, params.lengths)) {
      if (this.debug().slice(this.firstAtConstraint).includes('#')) {
        dError(this.debug());
        throw new Error('Invalid platform, unbound #');
      }
      if (!this.validate()) {
        dError(this.debug());
        throw new Error('Invalid platform, validate false');
      }
      dConstructor(true, this.debug());
    } else {
      dConstructor(false, this.slots.join(''), params.lengths);
    }
  }

  blocks(rendered?: string) {
    const blocks: { pos: number; length: number }[] = [];
    let prev = '';
    let result = 0;
    const subject = rendered ?? this.render();
    for (const [i, slot] of subject.split('').entries()) {
      if (slot === '#') {
        if (i === this.slots.length - 1) {
          blocks.push({ pos: i - result, length: result + 1 });
        } else {
          result += 1;
        }
      }
      if (slot !== '#' && prev === '#') {
        blocks.push({ pos: i - result - 1, length: result });
        result = 0;
      }
      prev = slot;
    }
    return blocks;
  }

  validate(blockLengths?: number[]) {
    const dValidate = debug('validate');
    const subject = blockLengths ?? this.blocks().map((b) => b.length);

    if (JSON.stringify(subject) !== JSON.stringify(this.validator)) {
      dValidate(this.debug(), subject, 'is invalid against', this.validator);
      return false;
    }
    return true;
  }

  fits(shifter: Shifter) {
    const dFits = debug('fits');
    const piece = this.slots.slice(
      shifter.position,
      shifter.position + shifter.length,
    );
    const next = this.slots.at(shifter.position + shifter.length) ?? ']';
    const prev =
      shifter.position === 0 ? '[' : this.slots.at(shifter.position - 1)!;

    const result =
      !piece.includes('.') &&
      next !== '#' &&
      prev !== '#' &&
      shifter.position <= this.slots.length - shifter.length;

    dFits(this.debug(), shifter, prev, piece.join(''), next, result);
    return result;
  }

  private canBePlaced(index: number, shifter: Shifter) {
    const dCanBePlaced = debug('canBePlaced');
    const base = this.withShifters({ without: index });
    dCanBePlaced(base, shifter);

    let result = this.fits(shifter);
    dCanBePlaced(result, this.debug());
    return result;
  }

  violatesGreedyMatch(beforeParam?: number): boolean {
    const dViolatesGreedyMatch = debug('violatesGreedyMatch');
    const before = beforeParam ?? this.shifters[0].position;
    const prefix =
      this.firstAtConstraint !== undefined
        ? this.debug().slice(0, this.firstAtConstraint)
        : '';
    const subject = this.debug().slice(this.firstAtConstraint ?? 0, before);
    if (subject.includes('#')) {
      dViolatesGreedyMatch(prefix, subject, this.debug().slice(before));
    }
    return subject.includes('#');
  }

  private covers(index: number, shifter: Shifter) {
    const dCovers = debug('covers');
    const result =
      index >= shifter.position && index <= shifter.position + shifter.length;
    dCovers(result, index, shifter);
    return result;
  }

  private lastExposedSpringIndex(): number | undefined {
    const dLastExposed = debug('lastExposed');
    for (const [fromEnd, slot] of this.debug().split('').reverse().entries()) {
      const index = this.debug().length - fromEnd - 1;
      if (slot === '#' && index >= (this.firstAtConstraint ?? 0)) {
        dLastExposed(
          'last exposed is',
          index,
          'earliest at',
          this.firstAtConstraint ?? 0,
          this.debug(),
        );
        return index;
      }
    }
    return undefined;
  }

  private coveringPositionRange(index: number, length: number) {
    return {
      start: index - length + 1,
      boundary: index + 1,
    };
  }

  private debugShifter(index: number): string {
    const shifter = this.shifters.at(index);
    if (!shifter) {
      dError(this.debug(), 'has no shifter at', index);
      throw new Error(`${this.debug()} has no shifter at ${index}`);
    }
    return Array(this.shifters[index].length)
      .fill(String.fromCharCode(97 + index))
      .join('');
  }

  /**
   * Move the rightmost shifters right until spring at index is covered.
   *
   * If a shifter can't cover it, it'll end up on the right side.
   * All the shifters that can't cover it end up on the right side.
   *
   * If none of the shifters can't cover it, return false else true.
   */
  private anchorShifter(index: number): boolean {
    const dAnchorShifter = debug('anchorShifter');
    dAnchorShifter(`${index}`.padStart(9, ' '), this.debug());
    const originalShifters = this.shifters.slice();
    for (let i = this.shifters.length - 1; i >= 0; i--) {
      if (this.shifters[i].position > index) {
        dAnchorShifter('Skip', i, `(${this.debugShifter(i)})`);
        continue;
      }
      dAnchorShifter('trying', this.debugShifter(i));
      let anchored = false;
      while (!anchored && this.shifters[i].position < index + 2) {
        if (!this.pushRight(i)) {
          this.shifters = originalShifters;
          dAnchorShifter(`${false}`.padStart(9, ' '), this.debug());
          return false;
        }
        if (this.covers(index, this.shifters[i])) {
          dAnchorShifter(`${true}`.padStart(9, ' '), this.debug());
          return true;
        }
      }
    }
    dAnchorShifter(
      `${false}`.padStart(9, ' '),
      this.debug(),
      'no candidates to try',
    );
    return false;
  }

  /**
   * Iterate springs from the end.
   * For each spring that isn't covered by a shifter,
   * anchor a shifter.
   */
  private anchorShifters(): boolean {
    const dAnchorShifters = debug('anchorShifters');
    dAnchorShifters('test', this.debug());
    let lastExposed = this.lastExposedSpringIndex();

    while (lastExposed !== undefined) {
      dAnchorShifters('last exposed', lastExposed);
      if (!this.anchorShifter(lastExposed)) {
        dAnchorShifters(false, this.debug());
        return false;
      }
      lastExposed = this.lastExposedSpringIndex();
    }

    dAnchorShifters(true, this.debug());
    if (this.violatesGreedyMatch()) {
      throw new Error('anchorShifters violates greedy');
    }
    if (!this.validate()) {
      throw new Error('anchorShifters invalid');
    }
    return true;
  }

  /**
   * Add each shifter to where it fits.
   */
  private addShifters(start: number, lengths: number[]): boolean {
    const dAddShifters = debug('addShifters');
    let length = lengths[0];
    dAddShifters('start', start, this.debug(), 'lengths', lengths);
    if (length === undefined) {
      throw new Error('Length undefined');
    }

    const last = this.shifters.at(-1);
    if (last && last.position + last.length + 1 >= start) {
      dError(
        'addShifters',
        this.debug(),
        'last shifter ends at',
        last.position + last.length,
        'cannot place at',
        start,
      );
      throw new Error('Start too small');
    }

    let shifterIndex = 0;
    let result = false;
    let position = start;
    while (position < this.slots.length) {
      if (
        this.fits({
          position,
          length,
        })
      ) {
        this.shifters.push({ position, length });
        position = position + length + 1;
        length = lengths[++shifterIndex];
        dAddShifters('added', this.debug(), position);
        if (length === undefined) {
          dAddShifters('no more shifters');
          result = true;
          break;
        }
      } else {
        position++;
      }
    }

    if (
      result &&
      this.debug()
        .slice(this.firstAtConstraint ?? 0)
        .includes('#')
    ) {
      result = this.anchorShifters();
    }

    dAddShifters(result, this.debug());
    return result;
  }

  pushRight(index: number): boolean {
    const dPushRight = debug('pushRight');
    dPushRight(
      `${index} (${this.debugShifter(index)})`.padStart(16, ' '),
      this.debug(),
    );
    const mathematicalBoundary =
      this.slots.length -
      this.shifters.slice(index + 1).reduce((acc, s) => acc + s.length + 1, 0);
    while (this.shifters[index].position < mathematicalBoundary) {
      const next = this.shifters.at(index + 1);

      if (
        next &&
        this.covers(
          this.shifters[index].position + this.shifters[index].length + 1,
          next,
        ) &&
        !this.pushRight(index + 1)
      ) {
        dPushRight(
          false,
          `${index}, (${this.debugShifter(index)})`.padStart(10, ' '),
          this.debug(),
        );
        return false;
      }
      this.shifters[index].position += 1;
      if (this.fits(this.shifters[index])) {
        dPushRight(
          true,
          `${index} (${this.debugShifter(index)})`.padStart(11, ' '),
          this.debug(),
        );
        return true;
      }
    }
    dPushRight(
      false,
      index,
      `(${this.debugShifter(index)})`,
      this.debug(),
      'already at maxBoundary',
    );
    return false;
  }

  shiftRight(index: number) {
    const dShiftRight = debug('shiftRight');
    dShiftRight('orig', this.debug(), this.shifters);
    const shifter = this.shifters[index];
    for (let i = shifter.position + 1; i < this.maxPosBoundary(index); i++) {
      if (
        this.canBePlaced(index, {
          ...shifter,
          position: i,
        })
      ) {
        shifter.position = i;
        dShiftRight('new ', this.debug());
        return i;
      }
    }
    dShiftRight('same', this.debug());
    return undefined;
  }

  freezeFirst(): void {
    this.slots = [
      ...this.renderSlots().slice(0, this.shifters[0].position),
      ...Array(this.shifters[0].length).fill('#'),
      ['.'] as SpringUnknown[],
      ...this.slots.slice(
        this.shifters[0].position + this.shifters[0].length + 1,
      ),
    ];
    this.shifters = this.shifters.slice(1);
  }

  withShifters(params?: { without?: number }): string {
    const dWithShifters = debug('withShifters');
    let result = '';
    let shifterIndex = 0;
    let i = 0;
    while (i < this.slots.length) {
      if (shifterIndex === params?.without) {
        shifterIndex++;
      }
      const shifter = this.shifters[shifterIndex];
      if (!shifter || i < shifter.position) {
        result += this.slots[i++];
      } else {
        result += Array(shifter.length).fill('#').join('');
        i += shifter.length;
        shifterIndex++;
      }
    }
    dWithShifters(
      this.slots.join(''),
      this.shifters,
      params ?? '',
      'returns',
      result,
      'which renders to',
      result.replace(/\?/g, '.'),
    );
    return result;
  }

  maxPosBoundary(shifterIndex: number) {
    const dMaxPos = debug('maxPosBoundary');
    let springBoundary = this.slots.length - 1;
    for (
      let i = this.shifters[shifterIndex].position;
      i < this.slots.length;
      i++
    ) {
      if (this.slots[i] === '#') {
        springBoundary = i;
        break;
      }
    }
    // Boundary is 1 greater than the pos
    springBoundary++;

    dMaxPos(
      this.slots.join(''),
      'start',
      this.shifters[shifterIndex].position,
      'produces spring pos',
      springBoundary,
    );
    const theoreticalBoundary =
      this.slots.length -
      this.shifters
        .slice(shifterIndex + 1)
        .reduce((acc, s) => acc + s.length + 1, 0);
    const boundary = Math.min(theoreticalBoundary, springBoundary);
    dMaxPos(
      this.debug(),
      `(length ${this.slots.length})`,
      'shifter',
      shifterIndex,
      'with current pos',
      this.shifters[shifterIndex].position,
      'with theoretical boundary',
      theoreticalBoundary,
      'and spring boundary',
      springBoundary,
      'is',
      boundary,
    );
    return boundary;
  }

  cacheKey() {
    const dCacheKey = debug('cacheKey');

    const set = this.validator.length / 5;

    // cache pieces with unfolded length
    if (![1, 2, 3, 4].map((n) => n * set).includes(this.shifters.length)) {
      return undefined;
    }

    const key = this.debug().slice(this.shifters[0].position);
    if (key.includes('#')) {
      return undefined;
    }

    dCacheKey(this.debug(), key);
    return key;
  }

  dance(prev: number = 0): number {
    const dDance = debug('dance');
    const iDance = debug('dance:info');

    dDance(this.debug());

    if (this.shifters.length === 0) {
      dDance('Zero shifters', prev);
      return prev;
    }

    let result = prev;

    if (this.shifters.length === 1) {
      iDance(this.render(), ++result);
      while (this.shiftRight(0) !== undefined) {
        iDance(this.render(), ++result);
      }
      dDance('result', result);
      return result;
    }

    const key = this.cacheKey();
    if (key) {
      const val = cache.get(key);
      if (val) {
        result = prev + val;
        iDance(this.debug(), 'hit', key, val, 'new result', result);

        return result;
      }
    }

    const options: DancePlatform[] = [];
    let i = this.shifters[0].position;
    dDance('computing maxPos', this.debug());
    while (i < this.maxPosBoundary(0)) {
      const option = this.option(i);
      if (option) {
        let duplicate = false;
        for (const o of options) {
          if (o.debug() === option.debug()) {
            duplicate = true;
            break;
          }
        }

        if (duplicate) {
          dDance('dedup'.padEnd(9, ' '), option.debug());
          i++;
          continue;
        }

        options.push(option);
        dDance(`option ${options.length - 1}`.padEnd(9, ' '), option.debug());
      }
      i++;
    }

    if (options.length === 0) {
      dDance('No options');
    } else {
      dDance('valid options');
      for (const option of options) {
        dDance(option.debug());
      }
    }
    // throw new Error('foo');

    for (const option of options) {
      result = option.dance(result);
    }
    if (key && !cache.has(key)) {
      const val = result - prev;
      iDance('cache set', key, val);
      cache.set(key, val);
    }
    return result;
  }

  option(firstAt: number): DancePlatform | undefined {
    const dOption = debug('option');
    dOption(
      'Trying lengths',
      this.shifters.map((s) => s.length),
      'starting at',
      firstAt,
      'on',
      this.slots.join(''),
    );
    if (firstAt > 1 && this.slots[firstAt - 1] === '#') {
      dOption('Not valid, previous was #');
      return undefined;
    }
    const platform = new DancePlatform({
      slots: this.slots.slice(),
      lengths: this.shifters.map((s) => s.length),
      validator: this.validator,
      firstAt,
    });

    if (platform.slots.length !== this.slots.length) {
      throw new Error('Invalid platform length');
    }

    if (!platform.validate()) {
      dOption('Invalid option');
      return undefined;
    }
    platform.freezeFirst();

    dOption(
      'Valid option, lengths',
      this.shifters.map((s) => s.length),
      'on',
      this.slots.join(''),
      'firstAt',
      firstAt,
      'results in',
      platform.debug(),
    );
    return platform;
  }

  render(): string {
    return this.withShifters().replace(/\?/g, '.');
  }

  renderSlots(): Spring[] {
    return this.slots.map((s) => (s === '?' ? '.' : s));
  }

  log() {
    return [this.render(), this.shifters.map((s) => s.position)];
  }

  debug() {
    let result = '';
    for (const [index, slot] of this.slots.entries()) {
      let added = false;
      for (const [shifterIndex, shifter] of this.shifters.entries()) {
        if (
          index >= shifter.position &&
          index < shifter.position + shifter.length
        ) {
          result += `${String.fromCharCode(97 + shifterIndex)}`;
          added = true;

          if (shifterIndex >= this.validator.length) {
            dError(`Encountered ${String.fromCharCode(97 + shifterIndex)}`);
            throw new Error(
              `Encountered ${String.fromCharCode(97 + shifterIndex)}`,
            );
          }
        }
      }
      if (!added) {
        result += slot;
      }
    }
    return result;
  }
}

function expandSlots(row: string) {
  return Array(4)
    .fill(row)
    .reduce((acc, curr) => [acc, curr].join('?'), row)
    .split('') as SpringUnknown[];
}

function expandLengths(lengthsInfo: string) {
  return Array(4)
    .fill(lengthsInfo)
    .reduce((acc, curr) => [acc, curr].join(','), lengthsInfo)
    .split(',')
    .map((c) => Number.parseInt(c));
}

function parseLine(line: string) {
  const [row, lengthsInfo] = line.split(' ', 2);

  const slots = expandSlots(row);
  const lengths = expandLengths(lengthsInfo);
  return new DancePlatform({
    slots,
    lengths,
    validator: lengths,
  });
}

(async () => {
  const dMain = debug('main');

  const file = await open(path.join(__dirname, '.', 'input.txt'));

  let sum = 3570355883263;
  let count = 1;
  for await (const line of file.readLines()) {
    cache.clear();
    const platform = parseLine(line);
    const danceResult = platform.dance();
    if (!danceResult) {
      throw new Error(`Zero with ${line}`);
    }
    sum += danceResult;
    dMain(
      new Date().toISOString(),
      line,
      count++,
      'dance result',
      danceResult,
      'sum',
      sum,
    );
  }
})();
