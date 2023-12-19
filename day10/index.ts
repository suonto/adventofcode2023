import { open } from 'node:fs/promises';
import path from 'node:path';
import { connected } from 'node:process';

const pieces = [
  '|', // vertical
  '-', //horizontal
  'L', //north-east
  'J', //north-west
  '7', //south-west
  'F', //south-east
  '.', //ground
  'S', //start
  'I',
  'O',
] as const;

type Piece = (typeof pieces)[number];
const directions = ['north', 'east', 'south', 'west'] as const;
function directionDiff(d1: Direction, d2: Direction): number {
  const index1 = directions.indexOf(d1);
  const index2 = directions.indexOf(d2);
  return (index1 - index2 + 4) % 4;
}

function directionFromDiff(d1: Direction, diff: number): Direction {
  const index1 = directions.indexOf(d1);
  const index2 = (index1 + diff + 4) % 4;
  return directions[index2];
}

type Direction = (typeof directions)[number];

class Place {
  type: Piece;
  distance?: number;
  x: number;
  y: number;
  startRelation: Direction[] = [];
  connectedFrom?: Direction;
  outsides?: Direction[] = undefined;
  isStart: boolean;
  heading?: Direction;

  constructor(params: { type: Piece; x: number; y: number }) {
    this.type = params.type;
    this.x = params.x;
    this.y = params.y;
    this.isStart = params.type === 'S';
  }

  toString(): string {
    return `${this.type} at ${this.y}, ${this.x}`;
  }

  getRelation(): Direction {
    const relation = this.startRelation[0];
    if (!relation) {
      throw new Error('No start relation');
    }
    return relation;
  }

  getConnectedFrom(): Direction {
    if (!this.connectedFrom) {
      throw new Error('No connected from');
    }
    return this.connectedFrom;
  }

  equals(place: Place): boolean {
    return this.x === place.x && this.y === place.y;
  }

  withRelation(relation: Direction): Place {
    if (this.startRelation.length === 1) {
      console.log('This is the end', this);
    }
    this.startRelation.push(relation);
    return this;
  }

  getDistance(): number {
    if (this.distance == null) {
      throw new Error(
        `type: ${this.type}, x: ${this.x}, y: ${this.y}: No distance`,
      );
    }
    return this.distance;
  }

  withDistance(distance: number): Place {
    this.distance = distance;
    return this;
  }

  withType(type: Piece): Place {
    this.type = type;
    return this;
  }

  withHeading(heading: Direction): Place {
    this.heading = heading;
    return this;
  }

  withOtherHeading(heading: Direction): Place {
    this.heading = this.other(heading);
    return this;
  }

  withOutsides(outsides: Direction[]): Place {
    this.outsides = outsides;
    return this;
  }

  withConnectedFrom(direction: Direction): Place {
    this.connectedFrom = direction;
    return this;
  }

  horizontalOpens(inside: boolean): boolean {
    return (
      !inside && (this.type === '|' || this.type === '7' || this.type === 'J')
    );
  }

  verticalOpens(inside: boolean): boolean {
    return (
      !inside && (this.type === '-' || this.type === 'J' || this.type === 'L')
    );
  }

  other(from: Direction): Direction {
    if (this.type === '|') return from === 'north' ? 'south' : 'north';
    if (this.type === '-') return from === 'east' ? 'west' : 'east';
    if (this.type === 'L') {
      if (from === 'north') return 'east';
      if (from === 'east') return 'north';
    }
    if (this.type === 'J') {
      if (from === 'north') return 'west';
      if (from === 'west') return 'north';
    }
    if (this.type === '7') {
      if (from === 'south') return 'west';
      if (from === 'west') return 'south';
    }
    if (this.type === 'F') {
      if (from === 'south') return 'east';
      if (from === 'east') return 'south';
    }
    throw new Error(`No other direction from ${from} for ${this.toString()}`);
  }

  paintOutsides(outside: Direction): void {
    this.outsides = [];
    if (this.type === '|') {
      if (outside === 'west') {
        this.outsides.push('west');
      } else if (outside === 'east') {
        this.outsides.push('east');
      }
    } else if (this.type === '-') {
      if (outside === 'north') {
        this.outsides.push('north');
      } else if (outside === 'south') {
        this.outsides.push('south');
      }
    } else if (this.type === 'L' && ['west', 'south'].includes(outside)) {
      this.outsides.push('west');
      this.outsides.push('south');
    } else if (this.type === 'J' && ['east', 'south'].includes(outside)) {
      this.outsides.push('east');
      this.outsides.push('south');
    } else if (this.type === '7' && ['north', 'east'].includes(outside)) {
      this.outsides.push('north');
      this.outsides.push('east');
    } else if (this.type === 'F' && ['north', 'west'].includes(outside)) {
      this.outsides.push('north');
      this.outsides.push('west');
    }
    console.log(
      'Painted outsides from',
      outside,
      this.toString(),
      this.heading,
      'outsides',
      this.outsides,
    );
  }
}

function parseLine(line: string) {
  return line.split('') as Piece[];
}

class Map {
  places: Place[][] = [];
  start: Place;
  end?: Place;
  validRelations: {
    [key in Direction]: boolean;
  } = {
    north: true,
    east: true,
    south: true,
    west: true,
  };

  belongsToLoop(place: Place): boolean {
    return (
      place.isStart || place.startRelation.some((r) => this.validRelations[r])
    );
  }

  oppositeDirection(direction: Direction): Direction {
    if (direction === 'north') return 'south';
    if (direction === 'south') return 'north';
    if (direction === 'east') return 'west';
    if (direction === 'west') return 'east';
    throw new Error(`Invalid direction ${direction}`);
  }

  to(place: Place, direction: Direction): Place {
    // console.log('Travelling from', place.toString(), 'to', direction);
    if (direction === 'north') {
      return this.places[place.y - 1][place.x].withOtherHeading(
        this.oppositeDirection(direction),
      );
    }
    if (direction === 'east') {
      return this.places[place.y][place.x + 1].withOtherHeading(
        this.oppositeDirection(direction),
      );
    }
    if (direction === 'south') {
      return this.places[place.y + 1][place.x].withOtherHeading(
        this.oppositeDirection(direction),
      );
    }
    if (direction === 'west') {
      return this.places[place.y][place.x - 1].withOtherHeading(
        this.oppositeDirection(direction),
      );
    }
    throw new Error(`Invalid direction ${direction} from ${place.toString()}}`);
  }

  findBorder(): Place {
    for (let y = 0; y < this.places.length; y++) {
      for (let x = 0; x < this.places[y].length; x++) {
        const place = this.places[y][x];
        if (this.belongsToLoop(place)) {
          return place;
        }
      }
    }
    throw new Error('No border');
  }

  paintNeighbours(place: Place): void {
    // console.log('Painting neighbours for', place.toString(), place.outsides);
    const neighbours: Place[] = [];
    if (place.outsides!.includes('north') && place.y > 0) {
      const neighbour = this.places[place.y - 1][place.x];
      if (!this.belongsToLoop(neighbour) && neighbour.type !== 'O') {
        neighbours.push(
          neighbour.withType('O').withOutsides(['north', 'east', 'west']),
        );
      }
    }
    if (
      place.outsides!.includes('east') &&
      place.x < this.places[place.y].length - 1
    ) {
      const neighbour = this.places[place.y][place.x + 1];
      if (!this.belongsToLoop(neighbour) && neighbour.type !== 'O') {
        neighbours.push(
          neighbour.withType('O').withOutsides(['north', 'east', 'south']),
        );
      }
    }
    if (place.outsides!.includes('south') && place.y < this.places.length - 1) {
      const neighbour = this.places[place.y + 1][place.x];
      if (!this.belongsToLoop(neighbour) && neighbour.type !== 'O') {
        neighbours.push(
          neighbour.withType('O').withOutsides(['east', 'south', 'west']),
        );
      }
    }
    if (place.outsides!.includes('west') && place.x > 0) {
      const neighbour = this.places[place.y][place.x - 1];
      if (!this.belongsToLoop(neighbour) && neighbour.type !== 'O') {
        neighbours.push(
          neighbour.withType('O').withOutsides(['north', 'south', 'west']),
        );
      }
    }
    for (const neighbour of neighbours) {
      // console.log('Cascading', neighbour.toString(), neighbour.outsides);
      this.paintNeighbours(neighbour);
    }
  }

  paintBorders(): void {
    let place = this.findBorder();
    let paintFrom: Direction = 'west';
    place.heading = ['|', 'L'].includes(place.type) ? 'north' : 'south';
    let previousHeading: Direction = place.heading;
    while (!place.outsides) {
      place.paintOutsides(paintFrom);
      this.paintNeighbours(place);
      place = this.to(place, place.heading!);
      const dDiff = directionDiff(place.heading!, previousHeading);
      previousHeading = place.heading!;
      paintFrom = directionFromDiff(paintFrom, dDiff);
      console.log(
        'Painting',
        place.toString(),
        'with heading',
        place.heading,
        'from',
        paintFrom,
      );
    }
    let sum = 0;
    for (const row of this.places) {
      for (const place of row) {
        if (!this.belongsToLoop(place) && place.type !== 'O') {
          place.type = 'I';
          sum++;
        }
      }
      console.log(row.map((p) => p.type).join(''));
    }
    console.log('Sum', sum);
  }

  editStart(): void {
    const place = this.getStart();
    if (this.validRelations.north && this.validRelations.south) {
      place.type = '|';
    } else if (this.validRelations.east && this.validRelations.west) {
      place.type = '-';
    } else if (this.validRelations.north && this.validRelations.east) {
      place.type = 'L';
    } else if (this.validRelations.north && this.validRelations.west) {
      place.type = 'J';
    } else if (this.validRelations.south && this.validRelations.west) {
      place.type = '7';
    } else if (this.validRelations.south && this.validRelations.east) {
      place.type = 'F';
    }
  }

  rejectRelation(relation: Direction, place: Place): undefined {
    console.log(
      'Relation',
      relation,
      'invalidated after',
      place.toString(),
      'connected from',
      place.connectedFrom,
    );
    this.validRelations[relation] = false;
    return undefined;
  }

  north(place: Place): Place | undefined {
    const relation = place.isStart ? 'north' : place.getRelation();
    if (place.y === 0) {
      return this.rejectRelation(relation, place);
    }
    const newPlace = this.places[place.y - 1][place.x];
    if (!['|', '7', 'F'].includes(newPlace.type)) {
      return this.rejectRelation(relation, place);
    }
    return this.registerEnd(
      newPlace
        .withRelation(relation)
        .withDistance(place.getDistance() + 1)
        .withConnectedFrom('south'),
    );
  }

  east(place: Place): Place | undefined {
    const relation = place.isStart ? 'east' : place.getRelation();
    if (place.x === this.places[place.y].length - 1) {
      return this.rejectRelation(relation, place);
    }
    const newPlace = this.places[place.y][place.x + 1];
    if (!['-', '7', 'J'].includes(newPlace.type)) {
      return this.rejectRelation(relation, place);
    }
    return this.registerEnd(
      newPlace
        .withRelation(relation)
        .withDistance(place.getDistance() + 1)
        .withConnectedFrom('west'),
    );
  }

  south(place: Place): Place | undefined {
    // console.log('South', place.toString());
    const relation = place.isStart ? 'south' : place.getRelation();
    if (place.y === this.places.length - 1) {
      return this.rejectRelation(relation, place);
    }
    const newPlace = this.places[place.y + 1][place.x];
    if (!['|', 'J', 'L'].includes(newPlace.type)) {
      return this.rejectRelation(relation, place);
    }
    return this.registerEnd(
      newPlace
        .withRelation(relation)
        .withDistance(place.getDistance() + 1)
        .withConnectedFrom('north'),
    );
  }

  west(place: Place): Place | undefined {
    const relation = place.isStart ? 'west' : place.getRelation();
    if (place.x === 0) {
      return this.rejectRelation(relation, place);
    }
    const newPlace = this.places[place.y][place.x - 1];
    if (!['-', 'L', 'F'].includes(newPlace.type)) {
      return this.rejectRelation(relation, place);
    }
    return this.registerEnd(
      newPlace
        .withRelation(relation)
        .withDistance(place.getDistance() + 1)
        .withConnectedFrom('east'),
    );
  }

  registerEnd(place: Place): Place {
    if (place.startRelation.length === 2) {
      this.end = place;
    }
    return place;
  }

  getStart(): Place {
    if (!this.start) {
      for (const row of this.places) {
        for (const place of row) {
          if (place.isStart) {
            this.start = place;
            return place;
          }
        }
      }
    }
    if (!this.start) {
      throw new Error('No start');
    }
    return this.start;
  }

  getAdjacent(place: Place): Place[] {
    const result: Place[] = [];
    if (
      ['S', '|', 'J', 'L'].includes(place.type) &&
      place.connectedFrom !== 'north'
    ) {
      const north = this.north(place);
      if (north) result.push(north);
    }
    if (
      ['S', '-', 'L', 'F'].includes(place.type) &&
      place.connectedFrom !== 'east'
    ) {
      const east = this.east(place);
      if (east) result.push(east);
    }
    if (
      ['S', '|', 'F', '7'].includes(place.type) &&
      place.connectedFrom !== 'south'
    ) {
      const south = this.south(place);
      if (south) result.push(south);
    }
    if (
      ['S', '-', 'J', '7'].includes(place.type) &&
      place.connectedFrom !== 'west'
    ) {
      const west = this.west(place);
      if (west) result.push(west);
    }

    return result;
  }
}

(async () => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));

  const map = new Map();
  for await (const line of file.readLines()) {
    const row: Piece[] = parseLine(line);
    // console.log(row);
    const places: Place[] = [];
    for (let i = 0; i < row.length; i++) {
      const type = row[i];
      const place = new Place({
        type,
        x: i,
        y: map.places.length,
      });
      if (type === 'S') {
        place.distance = 0;
      }
      places.push(place);
    }
    map.places.push(places);
    // console.log(places);
  }
  // console.log(map.places[0]);

  let adjacent = map.getAdjacent(map.getStart());
  // console.log('Initial adjacent:', adjacent);
  let i = 1;
  while (adjacent.length && i < 10000) {
    const newAdjacent: Place[] = [];
    console.log('Computing new adjacent', i, adjacent);
    for (const place of adjacent) {
      const adj = map.getAdjacent(place);
      console.log('Adjacent to', place.toString(), adj);
      if (map.end) {
        console.log('End found', map.end, 'distance', map.end.getDistance());
        break;
      }
      newAdjacent.push(...adj);
    }
    if (map.end) break;
    adjacent = newAdjacent.filter(
      (place) => map.validRelations[place.getRelation()],
    );
    console.log(adjacent);
    i++;
  }
  map.editStart();
  map.paintBorders();
})();
