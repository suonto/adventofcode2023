import debug from 'debug';
import { open } from 'node:fs/promises';
import path from 'node:path';

class Hub {
  private readonly d = debug('hub');
  private readonly dAddConnections = debug('hub:addConnections');
  name: string;
  conns: Hub[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addConnections(others: Hub[]) {
    this.dAddConnections(
      this.name,
      others.map((h) => h.name),
    );
    for (const hub of others) {
      hub.conns.push(this);
      this.conns.push(hub);
    }
  }

  isStub() {
    this.conns.length === 1;
  }

  stubHub() {
    return this.conns[0];
  }
}
function parseLine(line: string) {
  return line.split(':').map((s) => s.trim());
}

const parseHubs = async (): Promise<Hub[]> => {
  const file = await open(path.join(__dirname, '.', 'input.txt'));
  const dParse = debug('parse');

  const hubs: Hub[] = [];
  const connectionParams: { name: string; conns: string[] }[] = [];
  for await (const line of file.readLines()) {
    const [name, connectionArgs] = parseLine(line);
    connectionParams.push({ name, conns: connectionArgs.split(' ') });
    for (const hubName of [name, ...connectionArgs.split(' ')]) {
      if (!hubs.filter((h) => h.name === hubName).length) {
        hubs.push(new Hub(hubName));
      }
    }
  }
  dParse(connectionParams);
  dParse(hubs.map((h) => h.name));

  for (const { name, conns } of connectionParams) {
    const subject = hubs.find((h) => h.name === name)!;
    const others = conns.map((n) => hubs.find((h) => h.name === n)!);
    subject.addConnections(others);
  }

  return hubs;
};

const main = async () => {
  const dMain = debug('main');
  const hubs = await parseHubs();

  dMain('start');
};

if (require.main === module) {
  main();
}
