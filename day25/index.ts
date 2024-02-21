import debug from 'debug';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { Hub } from './hub';
import { LoverTree } from './loverTree';
import { Network } from './network';

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

const main = async () => {
  const dMain = debug('main');
  const network = await parseNetwork();

  const { source, lover } = LoverTree.createPair({
    root: network.getHub({ name: 'jqt' }),
    loverRoot: network.getHub({ name: 'rhn' }),
  });

  dMain(
    'source branches',
    source.branches.map((b) => b.map((h) => h.name)),
  );
  dMain(
    'lover branches',
    lover.branches.map((b) => b.map((h) => h.name)),
  );
  const growthStatuses = { source: true, lover: true };
  while (
    !Object.values(growthStatuses).every((growthStatus) => !growthStatus)
  ) {
    if (growthStatuses.source) growthStatuses.source = source.grow();
    if (growthStatuses.source) {
      dMain(
        'source branches',
        source.branches.map((b) => b.map((h) => h.name)),
      );
    }

    if (growthStatuses.lover) growthStatuses.lover = lover.grow();
    if (growthStatuses.lover) {
      dMain(
        'lover branches',
        lover.branches.map((b) => b.map((h) => h.name)),
      );
    }
  }
};

if (require.main === module) {
  main();
}
