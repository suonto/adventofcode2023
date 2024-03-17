import debug from 'debug';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { Hub } from './hub';
import { SourceTree } from './loveTree';
import { Network } from './network';
import { connectionToString } from './treeNodes';

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
  const dPrintTree = debug('printTree');

  const network = await parseNetwork();

  // const groupARoot = network.getHub({ name: 'ckf' });
  const groupARoot = network.getHub({ name: 'jqt' });
  const groupA: Hub[] = [groupARoot];
  const groupB: Hub[] = [];

  let count = 0;
  for (const other of network.hubs.filter((h) => h.name !== groupARoot.name)) {
    dMain('Compute', groupARoot.name, '->', other.name);
    const { source, lover } = SourceTree.createPair({
      source: groupARoot,
      lover: other,
    });

    source.growRoots();
    for (const conn of source.conns) {
      dMain('Root conn', connectionToString(conn));
    }
    dPrintTree(source.root.printTree());
    dPrintTree(lover.root.printTree());

    source.growTrunks();
    for (const conn of source.conns) {
      dPrintTree('conn', connectionToString(conn));
    }
    dPrintTree(source.root.printTree());
    dPrintTree(lover.root.printTree());

    let sourceGrowing = true;
    let loverGrowing = true;
    while (sourceGrowing || loverGrowing) {
      let sourceResult = source.growBranches();
      dPrintTree(source.root.printTree());
      if (sourceResult.newConn) {
        dPrintTree(lover.root.printTree());
      }
      sourceGrowing = sourceResult.growing;
      while (sourceResult.newConn) {
        sourceResult = source.growBranches(sourceResult.limit);
        dPrintTree(source.root.printTree());
        if (sourceResult.newConn) {
          dPrintTree(lover.root.printTree());
        }
      }

      let loverResult = lover.growBranches();
      dPrintTree(lover.root.printTree());
      if (loverResult.newConn) {
        dPrintTree(source.root.printTree());
      }
      loverGrowing = loverResult.growing;
      while (loverResult.newConn) {
        loverResult = lover.growBranches(loverResult.limit);
        dPrintTree(lover.root.printTree());
        if (loverResult.newConn) {
          dPrintTree(source.root.printTree());
        }
      }
    }

    for (const conn of source.conns) {
      dMain(connectionToString(conn));
    }

    const group = source.conns.length > 3 ? 'A' : 'B';
    dMain(
      groupARoot.name,
      '->',
      other.name,
      source.conns.length,
      'conns,',
      group,
      count++,
      '/',
      network.hubs.length,
    );
    if (group === 'A') {
      groupA.push(other);
    } else {
      groupB.push(other);
    }
  }
  dMain(
    'Group A:',
    groupA.map((h) => h.name),
  );
  dMain(
    'Group B:',
    groupB.map((h) => h.name),
  );
  dMain('Result:', groupA.length * groupB.length);
};
if (require.main === module) {
  main();
}
