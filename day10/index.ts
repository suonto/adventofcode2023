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
] as const;

type Piece = (typeof pieces)[number];
const directions = ['north', 'east', 'south', 'west'] as const;
type Direction = (typeof directions)[number];

class Place {
  type: Piece;
  distance?: number;
  x: number;
  y: number;
  startRelation: [Direction?, Direction?] = [];
  connectedFrom?: Direction;

  constructor(params: { type: Piece; x: number; y: number }) {
    this.type = params.type;
    this.x = params.x;
    this.y = params.y;
  }

  toString(): string {
    return `${this.type} at ${this.x}, ${this.y}`;
  }

  isStart(): boolean {
    return this.type === 'S';
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
      console.log(this);
      throw new Error('this is the end');
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

  withConnectedFrom(direction: Direction): Place {
    this.connectedFrom = direction;
    return this;
  }
}

function parseLine(line: string) {
  return line.split('') as Piece[];
}

class Map {
  places: Place[][] = [];
  start: Place;
  validRelations: {
    [key in Direction]: boolean;
  } = {
    north: true,
    east: true,
    south: true,
    west: true,
  };

  printPath(distances: boolean = false): void {
    for (const row of this.places) {
      let line = '';
      for (const place of row) {
        const val = distances ? place.distance : place.type;
        if (place.isStart() || place.startRelation.length) {
          line += val;
        } else {
          line += '#';
        }
      }
      console.log(line);
    }
  }

  addRow(row: Place[]): void {
    this.places.push(row);
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
    const relation = place.isStart() ? 'north' : place.getRelation();
    if (place.y === 0) {
      return this.rejectRelation(relation, place);
    }
    const newPlace = this.places[place.y - 1][place.x];
    if (!['|', '7', 'F'].includes(newPlace.type)) {
      return this.rejectRelation(relation, place);
    }
    return newPlace
      .withRelation(relation)
      .withDistance(place.getDistance() + 1)
      .withConnectedFrom('south');
  }

  east(place: Place): Place | undefined {
    const relation = place.isStart() ? 'east' : place.getRelation();
    if (place.x === this.places[place.y].length - 1) {
      return this.rejectRelation(relation, place);
    }
    const newPlace = this.places[place.y][place.x + 1];
    if (!['-', '7', 'J'].includes(newPlace.type)) {
      return this.rejectRelation(relation, place);
    }
    return this.places[place.y][place.x + 1]
      .withRelation(relation)
      .withDistance(place.getDistance() + 1)
      .withConnectedFrom('west');
  }

  south(place: Place): Place | undefined {
    const relation = place.isStart() ? 'south' : place.getRelation();
    if (place.y === this.places.length - 1) {
      return this.rejectRelation(relation, place);
    }
    const newPlace = this.places[place.y + 1][place.x];
    if (!['|', 'J', 'L'].includes(newPlace.type)) {
      return this.rejectRelation(relation, place);
    }
    return this.places[place.y + 1][place.x]
      .withRelation(relation)
      .withDistance(place.getDistance() + 1)
      .withConnectedFrom('north');
  }

  west(place: Place): Place | undefined {
    const relation = place.isStart() ? 'west' : place.getRelation();
    if (place.x === 0) {
      return this.rejectRelation(relation, place);
    }
    const newPlace = this.places[place.y][place.x - 1];
    if (!['-', 'L', 'F'].includes(newPlace.type)) {
      return this.rejectRelation(relation, place);
    }
    return this.places[place.y][place.x - 1]
      .withRelation(relation)
      .withDistance(place.getDistance() + 1)
      .withConnectedFrom('east');
  }

  getStart(): Place {
    if (!this.start) {
      for (const row of this.places) {
        for (const place of row) {
          if (place.isStart()) {
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
    console.log(row);
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
    console.log(places);
  }
  // console.log(map.places[0]);

  let adjacent = map.getAdjacent(map.getStart());
  console.log('Initial adjacent:', adjacent);
  let i = 1;
  let end = false;
  while (adjacent.length && i < 10000) {
    const newAdjacent: Place[] = [];
    console.log('Computing new adjacent', i, adjacent);
    for (const place of adjacent) {
      const adj = map.getAdjacent(place);
      console.log('Adjacent to', place.toString(), adj);
      if (adj.some((p) => p.equals(place))) {
        console.log('End found', place, 'distance', place.getDistance());
        end = true;
        break;
      }
      newAdjacent.push(...adj);
    }
    if (end) break;
    adjacent = newAdjacent.filter(
      (place) => map.validRelations[place.getRelation()],
    );
    console.log(adjacent);
    i++;
  }
  map.printPath();
  console.log(map.validRelations);
})();
