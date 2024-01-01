import { open } from 'node:fs/promises';
import path from 'node:path';
import debug from 'debug';

type Spring = '#' | '.';
type SpringUnknown = Spring | '?';

type Shifter = {
  length: number;
  position: number;
};

class DancePlatform {
  shifters: Shifter[] = [];
  slots: SpringUnknown[];
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
    this.validator = params.validator;
    this.firstAtConstraint = params.firstAt;
    dConstructor(
      'slots',
      this.slots.join(''),
      'lengths',
      params.lengths,
      'firstAt',
      params?.firstAt ?? 0,
    );
    for (const [i, length] of params.lengths.entries()) {
      if (i === 0) {
        const result = this.addShifter(i, length);
        if (!result && params.firstAt !== undefined) {
          break;
        }
      } else {
        this.addShifter(i, length);
      }
    }
    if (this.shifters.length === params.lengths.length) {
      dConstructor(this.debug());
    } else {
      dConstructor(
        'ERROR adding leghts',
        params.lengths,
        this.slots.join(''),
        this.shifters,
      );
    }
  }

  validate() {
    const dValidate = debug('validate');
    const blocks: number[] = [];
    let prev = '';
    let result = 0;
    for (const [i, slot] of this.render().split('').entries()) {
      if (slot === '#') {
        if (i === this.slots.length - 1) {
          blocks.push(result + 1);
        } else {
          result += 1;
        }
      }
      if (slot !== '#' && prev === '#') {
        blocks.push(result);
        result = 0;
      }
      prev = slot;
    }
    if (JSON.stringify(blocks) !== JSON.stringify(this.validator)) {
      dValidate(this.debug(), blocks, 'is invalid against', this.validator);
      return false;
    }
    return true;
  }

  private canBePlaced(index: number, shifter: Shifter) {
    const dCanBePlaced = debug('canBePlaced');
    const base = this.withShifters({ without: index });
    dCanBePlaced(base, shifter);
    const piece = base
      .split('')
      .slice(shifter.position, shifter.position + shifter.length)
      .join('');
    const result =
      !piece.includes('.') &&
      base[shifter.position + shifter.length] !== '#' &&
      (shifter.position === 0 || base[shifter.position - 1] !== '#') &&
      shifter.position <= this.slots.length - shifter.length;
    dCanBePlaced(shifter.position, piece, result);
    return result;
  }

  private addShifter(index: number, length: number): boolean {
    const dAddShifter = debug('addShifter');
    dAddShifter(this.debug(), length);
    if (this.firstAtConstraint && this.shifters.length === 0) {
      const shifter = {
        length,
        position: this.firstAtConstraint,
      };
      if (this.canBePlaced(index, shifter)) {
        this.shifters.push(shifter);
        dAddShifter('added firstAt', this.firstAtConstraint, this.debug());
        return true;
      } else {
        return false;
      }
    }
    const lastShifter = this.shifters.at(-1);
    const start = lastShifter
      ? lastShifter.position + lastShifter.length + 1
      : 0;
    for (let i = start; i < this.slots.length; i++) {
      const shifter: Shifter = {
        length,
        position: i,
      };
      if (this.canBePlaced(this.shifters.length, shifter)) {
        this.shifters.push(shifter);
        dAddShifter('added', this.debug());
        return true;
      }
    }
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
    // console.log(`With shifters without ${without}`);
    // console.log(result);
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

  maxPosBoundary(shifterIndex) {
    const dMaxPos = debug('maxPosBoundary');
    const boundary =
      this.slots.length -
      this.shifters
        .slice(shifterIndex + 1)
        .reduce((acc, s) => acc + s.length + 1, 0);
    dMaxPos(
      'maxPosBoundary',
      this.debug(),
      `(length ${this.slots.length})`,
      shifterIndex,
      `(with current pos ${this.shifters[shifterIndex].position}) is`,
      boundary,
    );
    return boundary;
  }

  dance(prev: number = 0) {
    const dDance = debug('dance');
    const iDance = debug('dance:info');
    dDance(
      this.slots.join(''),
      this.shifters.map((s) => s.length),
    );

    if (this.shifters.length === 0) {
      dDance('Zero shifters', prev);
      return prev;
    }

    let result = prev;
    if (this.shifters.length === 1) {
      if (this.validate()) iDance(this.render(), ++result);
      while (this.shiftRight(0) !== undefined) {
        if (this.validate()) iDance(this.render(), ++result);
      }
      dDance('result', result);
      return result;
    }

    const options: DancePlatform[] = [];
    for (let i = this.shifters[0].position; i < this.maxPosBoundary(0); i++) {
      const option = this.option(i);
      if (option) {
        options.push(option);
        dDance('option', options.length - 1, option.debug());
      }
    }

    if (options.length === 0) {
      dDance('No options');
    }

    for (const [index, option] of options.entries()) {
      result = option.dance(result);
    }
    dDance('result', result);
    if (result > 10) return result;
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

    if (platform.shifters.length < this.shifters.length) {
      dOption('Not valid, shifters do not fit');
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
          result += `${shifterIndex}`;
          added = true;
        }
      }
      if (!added) {
        result += slot;
      }
    }
    return result;
  }
}

function parseLine(line: string) {
  const [row, lengthsInfo] = line.split(' ', 2);

  const lengths = lengthsInfo.split(',').map((c) => Number.parseInt(c));
  return new DancePlatform({
    slots: row.split('') as SpringUnknown[],
    lengths,
    validator: lengths,
  });
}

(async () => {
  const dMain = debug('main');
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  let sum = 0;
  for await (const line of file.readLines()) {
    const platform = parseLine(line);
    dMain(
      'Base ',
      platform.slots.join(''),
      platform.shifters.map((s) => s.length),
    );
    const danceResult = platform.dance();
    sum += danceResult;
    dMain(
      'Platform',
      platform.slots.join(''),
      'dance result',
      danceResult,
      'sum',
      sum,
    );
  }
})();
