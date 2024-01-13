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
