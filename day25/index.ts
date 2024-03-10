import debug from 'debug';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { Hub } from './hub';
import { SourceTree } from './loveTree';
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

  const groupARoot = network.getHub({ name: 'jqt' });
  const other = network.getHub({ name: 'rhn' });

  const { source, lover } = SourceTree.createPair({
    source: groupARoot,
    lover: other,
  });
  source.connectAdjacentRoots();
  source.connectCommonTrunks();
  dMain('source.adolescentGrow', source.adolescentGrow());
  dMain('lover.adolescentGrow', lover.adolescentGrow());
  dMain('source.adolescentGrow', source.adolescentGrow());
  dMain('source.adolescentGrow', source.adolescentGrow());
};
// 518384 too low
if (require.main === module) {
  main();
}
