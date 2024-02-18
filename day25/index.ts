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
  dParse(connectionParams);
  dParse(network.hubs.map((h) => h.name));

  for (const { name, peers } of connectionParams) {
    const subject = network.hubs.find((h) => h.name === name)!;
    const others = peers.map((n) => network.hubs.find((h) => h.name === n)!);
    subject.addConnections(others);
  }

  return network;
};

type Connection = {
  path: Hub[];
};

const advance = (conn: Connection, others: Connection[]): Connection[] => {
  const result: Connection[] = [];
  const current = conn.path.at(-1)!;
  for (const peer of current.peers) {
    let unique = true;
    for (const path of others.map((c) => c.path)) {
      if (path.includes(peer)) {
        unique = false;
        break;
      }
    }
    if (unique) {
      result.push({ path: [...conn.path, peer] });
    } else {
      continue;
    }
  }
  return result;
};

class Network {
  private readonly d = debug('network');
  hubs: Hub[] = [];

  uniqueConns(a: Hub, b: Hub): Connection[] {
    const result: Connection[] = [];
    const conns: Connection[] = a.peers.map((h) => ({
      variations: 1,
      path: [h],
    }));
    let conn = conns.shift();
    while (conn) {
      const newConns = advance(conn, conns);
      for (const complete of newConns.filter((c) => c.path[-1] === b)) {
        this.d(
          'complete',
          complete.path.map((h) => h.name),
        );
        result.push(complete);
      }
      for (const conn of newConns.filter((c) => c.path[-1] !== b)) {
        this.d(
          'new conn',
          conn.path.map((h) => h.name),
        );
        conns.push(conn);
      }
      conn = conns.shift();
    }

    return result;
  }
}

const main = async () => {
  const dMain = debug('main');
  const network = await parseNetwork();

  const conns = network.uniqueConns(network.hubs[0], network.hubs[1]);

  dMain(conns);
};

if (require.main === module) {
  main();
}
