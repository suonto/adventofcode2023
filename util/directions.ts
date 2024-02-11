import { Point } from './point';

export const directions = ['up', 'right', 'down', 'left'] as const;
export type Direction = (typeof directions)[number];

export function next(direction: Direction): Direction {
  return directions[(directions.indexOf(direction) + 1) % directions.length];
}

export function prev(direction: Direction): Direction {
  return directions[(directions.indexOf(direction) + 3) % directions.length];
}

export function opposite(direction: Direction): Direction {
  return next(next(direction));
}

export function diffs(direction: Direction): Point {
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
