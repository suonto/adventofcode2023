import debug from 'debug';

export class Hub {
  private readonly d = debug('hub');
  private readonly dAddConnections = debug('hub:addConnections');
  name: string;
  group?: 'A' | 'B';
  peers: Hub[] = [];
  connected = false;

  constructor(name: string) {
    this.name = name;
  }

  addConnections(others: Hub[]) {
    this.dAddConnections(
      this.name,
      others.map((h) => h.name),
    );
    for (const hub of others) {
      hub.peers.push(this);
      this.peers.push(hub);
    }
  }
}
