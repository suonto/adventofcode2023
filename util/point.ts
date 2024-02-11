export type Point = { x: number; y: number };

export const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
