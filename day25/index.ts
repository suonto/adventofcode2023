import debug from 'debug';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { Hub } from './hub';
import { Branch, LoverTree, printPath } from './loverTree';
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

const scoreKey = (branch: Branch): string =>
  branch
    .slice(0, 2)
    .map((h) => h.name)
    .join(',');

const getScore = (params: {
  key: string;
  scores: Map<string, number>;
}): number => {
  const { key, scores } = params;
  const score = scores.get(key);
  if (!score) {
    throw new Error(`No score for ${key}`);
  }
  return score;
};

const connect = (params: {
  sourceTree: LoverTree;
  options: Map<Branch, Set<Branch>>;
}): Hub[] | undefined => {
  const dConnect = debug('connect');
  const { sourceTree, options } = params;
  const scores = connectScores(options);
  const sortedOpts = [...options.entries()].sort(
    (a, b) =>
      getScore({ key: scoreKey(a[0]), scores }) -
      getScore({ key: scoreKey(b[0]), scores }),
  );

  const first = sortedOpts.at(0);
  if (!first) {
    dConnect('No branches left.');
    return undefined;
  }

  const [best, bestOpts] = first;
  const bestOpt = [...bestOpts]
    .sort(
      (a, b) =>
        getScore({ key: scoreKey(a), scores }) -
        getScore({ key: scoreKey(b), scores }),
    )
    .at(0);

  if (!bestOpt) {
    throw new Error(`No bestOpt for ${printPath(best)}`);
  }
  dConnect(
    'Scores',
    [...scores.entries()].map(([key, score]) => `${key}: ${score}`),
  );

  const connection =
    best.at(0) === sourceTree.root
      ? [...best, ...[...bestOpt].reverse()]
      : [...bestOpt, ...[...best].reverse()];

  dConnect(
    'Connecting',
    printPath(connection),
    'from',
    printPath(best),
    `(${getScore({ key: scoreKey(best), scores })}) and`,
    printPath(bestOpt),
    `(${getScore({ key: scoreKey(bestOpt), scores })})`,
  );
  sourceTree.connect(connection);

  const toBeDeleted: Branch[] = [best, bestOpt];
  for (const [branch, opts] of options.entries()) {
    if (!branch.every((h) => !sourceTree.connected.has(h))) {
      options.delete(branch);
      continue;
    }
    for (const opt of opts.keys()) {
      if (!opt.every((h) => !sourceTree.connected.has(h))) {
        opts.delete(opt);
      }
    }
    opts.delete(best);
    opts.delete(bestOpt);
    if (!opts.size) {
      toBeDeleted.push(branch);
    }
  }

  toBeDeleted.forEach((b) => {
    dConnect(printPath(b), 'no longer has options, deleting');
    options.delete(b);
  });

  return connection;
};

const connectScores = (
  options: Map<Branch, Set<Branch>>,
): Map<string, number> => {
  const scores = new Map<string, number>();
  for (const [branch, opts] of options) {
    const key = scoreKey(branch);
    scores.set(key, (scores.get(key) ?? 0) + opts.size);
  }
  return scores;
};

const connections = (params: { sourceRoot: Hub; loverRoot: Hub }): Hub[][] => {
  const dConnections = debug('connections');
  const { sourceRoot, loverRoot } = params;
  const { source, lover } = LoverTree.createPair({
    root: sourceRoot,
    loverRoot: loverRoot,
  });

  dConnections(
    'source branches',
    source.branches.map((b) => b.map((h) => h.name)),
  );
  dConnections(
    'lover branches',
    lover.branches.map((b) => b.map((h) => h.name)),
  );
  const growthStatuses = { source: true, lover: true };
  while (
    !Object.values(growthStatuses).every((growthStatus) => !growthStatus)
  ) {
    if (growthStatuses.source) growthStatuses.source = source.grow();
    if (growthStatuses.source) {
      dConnections(
        'source branches',
        source.branches.map((b) => b.map((h) => h.name)),
      );
    }

    if (growthStatuses.lover) growthStatuses.lover = lover.grow();
    if (growthStatuses.lover) {
      dConnections(
        'lover branches',
        lover.branches.map((b) => b.map((h) => h.name)),
      );
    }
  }

  const contacts = source.directContacts();
  dConnections(
    'after contacts',
    source.connections.map((c) => printPath(c)),
  );
  const meetingPoints = source.meetingPoints();
  dConnections(
    'after points',
    source.connections.map((c) => printPath(c)),
  );
  const options = source.options({
    contacts,
    meetingPoints,
  });

  let connection = connect({ sourceTree: source, options });
  while (connection) {
    connection = connect({ sourceTree: source, options });
  }

  dConnections(
    'final',
    source.connections.map((c) => printPath(c)),
  );
  return source.connections;
};

const main = async () => {
  const dMain = debug('main');
  const network = await parseNetwork();

  const groupARoot = network.getHub({ name: 'ckf' });

  const groupA = [groupARoot];
  const groupB: Hub[] = [];
  for (const other of network.hubs.filter((h) => h !== groupARoot)) {
    dMain(groupARoot.name, '->', other.name);
    const conns = connections({
      sourceRoot: groupARoot,
      loverRoot: other,
    });
    const sameGroup = conns.length > 3;
    dMain(
      groupARoot.name,
      '->',
      conns.length,
      'conns.',
      other.name,
      'goes to',
      sameGroup ? 'A' : 'B',
    );
    if (sameGroup) {
      groupA.push(other);
    } else {
      groupB.push(other);
    }
  }

  dMain(
    'Group A',
    groupA.map((h) => h.name),
  );
  dMain(
    'Group B',
    groupB.map((h) => h.name),
  );
};

if (require.main === module) {
  main();
}
