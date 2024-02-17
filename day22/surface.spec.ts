import { describe, expect, test } from '@jest/globals';
import debug from 'debug';
import { Surface } from './surface';

const dTest = debug('test');

describe('Surface', () => {
  const surface = new Surface({
    start: { x: -2, y: -2 },
    end: { x: 2, y: 2 },
    z: 0,
  });

  test('overlap A', () => {
    const surfaceA = new Surface({
      start: { x: -3, y: -1 },
      end: { x: -1, y: 1 },
      z: 0,
    });

    [surface.overlap(surfaceA), surfaceA.overlap(surface)].forEach((overlap) =>
      expect(overlap).toMatchObject({
        start: { x: -2, y: -1 },
        end: { x: -1, y: 1 },
      }),
    );
  });

  test('overlap B', () => {
    const surfaceB = new Surface({
      start: { x: 0, y: 0 },
      end: { x: 8, y: 8 },
      z: 0,
    });

    [surface.overlap(surfaceB), surfaceB.overlap(surface)].forEach((overlap) =>
      expect(overlap).toMatchObject({
        start: { x: 0, y: 0 },
        end: { x: 2, y: 2 },
      }),
    );
  });

  test('No overlap', () => {
    const surfaceC = new Surface({
      start: { x: 2, y: 0 },
      end: { x: 8, y: 8 },
      z: 0,
    });

    [surface.overlap(surfaceC), surfaceC.overlap(surface)].forEach((overlap) =>
      expect(overlap).toBeUndefined(),
    );
  });
});
