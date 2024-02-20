import debug from 'debug';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { Hub } from './hub';

function parseLine(line: string) {
  return line.split(':').map((s) => s.trim());
}

const parseNetwork = async (): Promise<Network> => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));
  const dParse = debug('parse');

  const network = new Network();
  const connectionParams: { name: string; peers: string[] }[] = [];
  for await (const line of file.readLines()) {
    const [name, connectionArgs] = parseLine(line);
    connectionParams.push({ name, peers: connectionArgs.split(' ') });
    for (const hubName of [name, ...connectionArgs.split(' ')]) {
      if (!network.hubs.filter((h) => h.name === hubName).length) {
        network.hubs.push(new Hub(hubName));
      }
    }
  }

  for (const { name, peers } of connectionParams) {
    const subject = network.hubs.find((h) => h.name === name)!;
    const others = peers.map((n) => network.hubs.find((h) => h.name === n)!);
    subject.addConnections(others);
  }

  dParse(
    network.hubs.map((h) => ({
      name: h.name,
      peers: h.peers.map((h) => h.name),
    })),
  );

  return network;
};

class Connection {
  private readonly d = debug('connection');
  readonly src: Hub;
  readonly dest: Hub;
  path: Hub[];

  constructor(params: { src: Hub; dest: Hub; path: Hub[] }) {
    this.src = params.src;
    this.dest = params.dest;
    this.path = params.path;
  }

  intercects(other: Connection): boolean {
    let result = false;
    for (const hub of this.path) {
      if (hub !== this.dest && !other.path.every((h) => h !== hub)) {
        result = true;
        break;
      }
    }
    this.d(
      'intersects',
      result,
      this.path.map((h) => h.name),
      other.path.map((h) => h.name),
    );
    return result;
  }

  with(hub: Hub): Connection {
    this.path.push(hub);
    return this;
  }

  advance(): Connection[] {
    const result: Connection[] = [];
    for (const peer of (this.path.at(-1) ?? this.src).peers) {
      if (![this.src, ...this.path].includes(peer)) {
        result.push(Connection.from(this).with(peer));
      }
    }
    return result;
  }

  finished(): boolean {
    return this.path.at(-1) === this.dest;
  }

  static from(other: Connection): Connection {
    return new Connection({
      ...other,
      path: [...other.path],
    });
  }
}

class Network {
  private readonly d = debug('network');
  hubs: Hub[] = [];

  uniqueConns(a: Hub, b: Hub): Connection[] {
    const dUniqueConns = debug('uniqueConns');
    dUniqueConns(a.name, b.name);
    const finished: Connection[] = [];
    const conns: Connection[] = [
      new Connection({
        src: a,
        dest: b,
        path: [],
      }),
    ];

    let conn = conns.shift();
    while (conn) {
      for (const newConn of conn
        .advance()
        .filter((newConn) => finished.every((c) => !newConn.intercects(c)))) {
        if (newConn.finished()) {
          dUniqueConns(
            'finished',
            newConn.path.map((h) => h.name),
          );
          finished.push(newConn);
        } else {
          dUniqueConns(
            'new unique conn',
            newConn.path.map((h) => h.name),
          );
          conns.push(newConn);
        }
      }
      conn = conns.shift();
    }

    dUniqueConns(
      a.name,
      b.name,
      'connections',
      finished.map((c) => c.path.map((h) => h.name)),
    );
    this.d('sameGroup', a.name, b.name, `(${finished.length} conns)`);
    return finished;
  }
}

const main = async () => {
  const dMain = debug('main');
  const network = await parseNetwork();

  const rootA = network.hubs[0].name;
  const groupA = network.hubs.filter((h) => h.name === rootA);

  const groupB: Hub[] = [];
  for (const candidate of network.hubs.filter((h) => h.name !== rootA)) {
    if (network.uniqueConns(groupA[0], candidate).length > 3) {
      dMain('same group', rootA, candidate.name);
      groupA.push(candidate);
    } else {
      dMain('other group', rootA, candidate.name);
      groupB.push(candidate);
    }
  }

  dMain({
    groupA: groupA.map((h) => h.name),
    groupB: groupB.map((h) => h.name),
    result: groupA.length * groupB.length,
  });
};

if (require.main === module) {
  main();
}
