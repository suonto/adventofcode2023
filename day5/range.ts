import debug from 'debug';
import { dError } from './debug';

type Overlap = {
  left?: Range;
  both?: Range;
  right?: Range;
};

type Extract = {
  left?: Range;
  between?: Range;
  right?: Range;
};

export class Range {
  start: number;
  effectiveStart: number;
  boundary: number;
  effectiveBoundary: number;
  length: number;
  offset: number;
  from?: string;

  constructor(params: {
    start: number;
    boundary: number;
    length: number;
    offset: number;
    from?: string;
  }) {
    this.start = params.start;
    this.effectiveStart = params.start + params.offset;
    this.boundary = params.boundary;
    this.effectiveBoundary = params.boundary + params.offset;
    this.offset = params.offset;
    this.length = params.length;
    this.from = params.from;
    if (this.invalid()) {
      dError('Invalid Range', this);
    }
  }

  invalid(): boolean {
    return (
      this.start + this.length !== this.boundary ||
      this.start < 0 ||
      this.effectiveStart < 0
    );
  }

  contains(index: number) {
    return this.start <= index && index < this.boundary;
  }

  effectiveContainsRange(range: Range) {
    return (
      this.effectiveStart <= range.start &&
      range.boundary <= this.effectiveBoundary
    );
  }

  /**
   * @param ranges returns the smallest value of this range when found and mapped with other ranges
   */
  min(ranges: Range[]) {
    const dMin = debug('min');
    let result: number = Number.MAX_SAFE_INTEGER;
    for (const other of ranges) {
      let minInRange: number | undefined = undefined;
      if (other.start < this.boundary && other.boundary > this.start) {
        dMin('other overlaps', this, other);
        const first = Math.max(this.start, other.start);
        minInRange = first + other.offset;
        dMin('min overlap', first, other.offset, minInRange);
        result = Math.min(result, minInRange);
      }
    }
    return result;
  }

  copy(from?: string): Range {
    return new Range({
      start: this.start,
      length: this.length,
      boundary: this.boundary,
      offset: this.offset,
      from,
    });
  }

  /**
   * returns 2 things:
   *    left: the lesser section of child range that the parent range or effective range doesn't cover
   *    right: the greater section of child range that the parent range or effective range doesn't cover
   */
  extract(parent: Range): Extract {
    const dExtract = debug('extract');
    const result: Extract = {};

    let inbetween: Range | undefined = undefined;
    // parent range is exclusively lesser than parent effective range
    // parent    1-3       boundary is 4
    // effective       7-9 boundary is 10
    // inbetween    4-6    boundary is 7
    if (parent.boundary < parent.effectiveStart) {
      inbetween = new Range({
        start: parent.boundary,
        length: parent.effectiveStart - parent.boundary,
        boundary: parent.effectiveStart,
        offset: 0,
      });
    }

    // parent range is exclusively greater than parent effective range
    // parent          7-9 boundary is 10
    // effective 1-3       boundary is 4
    // inbetween    4-6    boundary is 7
    if (parent.effectiveBoundary < parent.start) {
      inbetween = new Range({
        start: parent.effectiveBoundary,
        length: parent.start - parent.effectiveBoundary,
        boundary: parent.start,
        offset: 0,
      });
    }

    if (
      inbetween &&
      (inbetween.contains(this.start) || inbetween.contains(this.boundary - 1))
    ) {
      const start = Math.max(this.start, inbetween.start);
      const boundary = Math.min(this.boundary, inbetween.boundary);
      result.between = new Range({
        start,
        length: boundary - start,
        boundary,
        offset: this.offset,
        from: 'extract.between',
      });
    }

    // child range start is lesser than parent start and parent effective start
    // child     1-----7   boundary is 8
    // parent        5---9 boundary is 10
    // effective    4---8  boundary is 9
    // left      1--4      boundary is 5
    if (this.start < Math.min(parent.start, parent.effectiveStart)) {
      const boundary = Math.min(
        this.boundary,
        parent.start,
        parent.effectiveStart,
      );
      result.left = new Range({
        start: this.start,
        length: boundary - this.start,
        boundary,
        offset: this.offset,
        from: 'extract.left',
      });
    }

    // child range boundary is greater than parent boundary and parent effective boundary
    // child        4----9 boundary is 10
    // parent    1-----7   boundary is 8
    // effective  2-----8  boundary is 9
    // right             9 boundary is 10
    if (this.boundary > Math.max(parent.boundary, parent.effectiveBoundary)) {
      const start = Math.max(
        this.start,
        parent.boundary,
        parent.effectiveBoundary,
      );
      const length = this.boundary - start;
      result.right = new Range({
        start,
        length,
        boundary: this.boundary,
        offset: this.offset,
        from: 'extract.right',
      });
    }

    dExtract(this, parent, result);
    return result;
  }

  /**
   * @returns 3 things:
   *  clean parent section (new Range) on the left side of overlap:
   *    - child range contains parent effective last (boundary + offset - 1)
   *    - only parent effects apply
   *  clean parent section (new Range) on the right side of overlap:
   *    - child range contains parent effective start
   *    - only parent effects apply
   *    - needs to be reprocessed for greater child ranges
   *  overlapping area (new Range)
   *    - both effects apply
   */
  overlap(child: Range): Overlap {
    const dOverlap = debug('overlap');
    const result: Overlap = {};

    if (this.effectiveContainsRange(child)) {
      const bothStart = child.start - this.offset;
      const bothLength = child.length;
      const bothBoundary = bothStart + bothLength;
      result.both = new Range({
        start: bothStart,
        length: bothLength,
        boundary: bothBoundary,
        offset: this.offset + child.offset,
        from: 'overlap.full.both',
      });
      if (this.start < bothStart) {
        const leftStart = this.start;
        const leftLength = bothStart - this.start;
        result.left = new Range({
          start: leftStart,
          length: leftLength,
          boundary: leftStart + leftLength,
          offset: this.offset,
          from: 'overlap.full.left',
        });
      }
      if (this.boundary > bothBoundary) {
        const rightStart = bothBoundary;
        const rightLength = this.boundary - bothBoundary;
        result.right = new Range({
          start: rightStart,
          length: rightLength,
          boundary: rightStart + rightLength,
          offset: this.offset,
          from: 'overlap.full.right',
        });
      }
    }

    // child range contains parent effective last
    // clean part of parent on the right side of overlap
    // parent    1----6    boundary is 8
    // effective  2----7   boundary is 8
    // child        4----9 boundary is 10
    // overlap      4--7   boundary is 8 -> 3--6
    // left       23       boundary is 3 -> 12 length (2) is child.start - this.effectiveStart

    // parent     2----7   boundary is 8
    // effective 1----6    boundary is 7
    // child        4----9 boundary is 10
    // overlap      4-6    boundary is 7 -> 5-7
    // left      1-3       boundary is 4 -> 34 length (3) is child.start - this.effectivestart
    if (child.contains(this.effectiveBoundary - 1)) {
      // max(15, 25 -(-15)) = 40
      const start = Math.max(this.effectiveStart, child.start) - this.offset;
      // min(35, 95) -(-15) - 40 = 10
      const length =
        Math.min(this.effectiveBoundary, child.boundary) - this.offset - start;
      const both = new Range({
        start,
        length,
        boundary: start + length,
        offset: this.offset + child.offset,
        from: 'overlap.left.both',
      });
      result.both = both;
      if (this.effectiveStart < child.start) {
        const length = this.length - result.both.length;
        result.left = new Range({
          start: this.start,
          length,
          boundary: this.start + length,
          offset: this.offset,
          from: 'overlap.left.left',
        });
      }
      if (result.both.invalid() || result.left?.invalid()) {
        dOverlap('Invalid overlap.left result', this, child, result);
      }
    }

    // child range contains parent effective start
    // clean part of parent on the right side of overlap
    // parent      3----8  boundary is 9
    // effective    4----9 boundary is 10
    // child     1-----7   boundary is 8
    // overlap      4--7   boundary is 8 -> 3--6
    // right            89 boundary is 10 -> 78
    if (child.contains(this.effectiveStart)) {
      const length =
        Math.min(this.effectiveBoundary, child.boundary) - this.effectiveStart;
      result.both = new Range({
        start: this.start,
        length,
        boundary: this.start + length,
        offset: this.offset + child.offset,
        from: 'overlap.right.both',
      });
      if (this.effectiveBoundary > child.boundary) {
        const length = this.effectiveBoundary - child.boundary;
        const start = this.start + this.length - length;
        result.right = new Range({
          start,
          length,
          boundary: start + length,
          offset: this.offset,
          from: 'overlap.right.right',
        });
      }
    }

    if (!result.both) {
      // no overlap, parent on the left
      if (this.effectiveStart < child.start) {
        const left = this.copy('overlap.neither.left');
        if (left.invalid()) {
          dError('Invalid left', this);
        }
        result.left = left;
        // no overlap, parent on the right
      } else {
        const right = this.copy('overlap.neither.right');
        if (right.invalid()) {
          dError('Invalid right', this);
        }
        result.right = right;
      }
    } else {
      dOverlap(this, child, result);
    }

    if (
      (result.left?.length ?? 0) +
        (result.both?.length ?? 0) +
        (result.right?.length ?? 0) !==
      this.length
    ) {
      dError('Invalid overlap result', this, child, result);
    }
    return result;
  }
}
