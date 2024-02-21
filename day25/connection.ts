import debug from 'debug';
import { Hub } from './hub';

export class Connection {
  private readonly d = debug('connection');
  readonly src: Hub;
  readonly path: Hub[];

  constructor(params: { src: Hub; path?: Hub[] }) {
    this.src = params.src;
    this.path = params.path ?? [];
    if (!this.path.length) {
      this.path.push(this.src);
    }
  }

  get edge(): Hub {
    const hub = this.path.at(-1);
    if (!hub) throw new Error('Conn has no edge.');
    return hub;
  }

  with(hub: Hub): Connection {
    this.path.push(hub);
    return this;
  }

  advance(): Connection[] {
    const result: Connection[] = [];
    const start = this.path.at(-1) ?? this.src;
    for (const peer of start.peers.filter((p) => !this.path.includes(p))) {
      result.push(Connection.from(this).with(peer));
    }
    return result;
  }

  static from(other: Connection): Connection {
    return new Connection({
      ...other,
      path: [...other.path],
    });
  }

  toString() {
    return `[${this.path.map((h) => h.name)}]`;
  }
}
