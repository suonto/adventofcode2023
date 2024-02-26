import debug from 'debug';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { Hub } from './hub';
import { Branch, LoverTree, printBranch } from './loverTree';
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

const connect = (
  options: Map<Branch, Set<Branch>>,
): [Branch, Branch] | undefined => {
  const dConnect = debug('connect');
  const sortedOpts = [...options.entries()].sort(
    (a, b) => a[1].size - b[1].size,
  );
  const candidates: [Branch, Set<Branch>][] = [];
  for (let i = 0; i < sortedOpts.length; i++) {
    const [branch, opts] = sortedOpts.at(i)!;
    if (sortedOpts.at(0)![1].size !== opts.size) {
      break;
    }
    candidates.push([branch, opts]);
  }

  for (const [branch, opts] of candidates.sort(
    (a, b) => b[1].size - a[1].size,
  )) {
    const option = [...opts][0];
    opts.delete(option);
    if (!opts.size) {
      options.delete(branch);
    }

    const optionOptions = options.get(option)!;
    optionOptions.delete(branch);
    if (!optionOptions.size) {
      options.delete(option);
    }

    dConnect(printBranch(branch), printBranch(option));
    return [branch, option];
  }
  return undefined;
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

  const contacts = source.directContacts();
  const result: { source: Hub[]; lover: Hub[] }[] = [];

  const sourceRootBranch = source.existing([source.root]);
  const loverRootBranch = lover.existing([lover.root]);
  let rootNeighbours = false;
  for (const [sourceBranch, loverBranches] of contacts) {
    for (const loverBranch of loverBranches) {
      if (
        sourceBranch === sourceRootBranch &&
        loverBranch === loverRootBranch
      ) {
        result.push({ source: sourceBranch, lover: loverBranch });
        contacts.get(sourceBranch)!.delete(loverRootBranch);
        contacts.get(loverRootBranch)!.delete(sourceBranch);
        rootNeighbours = true;
        break;
      }
    }
    if (rootNeighbours) break;
  }

  const meetingPoints = source.meetingPoints();
  const options = source.options({
    contacts,
    meetingPoints,
  });

  let connection = connect(options);
  while (connection) {
    const [one, other] = connection;
    result.push(
      connection[0][0] === source.root
        ? { source: one, lover: other }
        : { source: other, lover: one },
    );
    connection = connect(options);
  }

  dMain(
    result.map(({ source, lover }) => ({
      source: printBranch(source),
      lover: printBranch(lover),
    })),
  );
};

if (require.main === module) {
  main();
}
