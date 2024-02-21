import debug from 'debug';
import { Hub } from './hub';

export class Network {
  private readonly d = debug('network');
  private readonly _hubs: Hub[] = [];

  addHub(hub: Hub): void {
    this._hubs.push(hub);
  }

  get hubs() {
    return this._hubs;
  }

  getHub(params: { i?: number; name?: string }): Hub {
    const { i, name } = params;
    const hub = i ? this.hubs.at(i) : this.hubs.find((h) => h.name === name);
    if (!hub) {
      throw new Error(`Network has no hub that matches ${params}`);
    }
    return hub;
  }
}
