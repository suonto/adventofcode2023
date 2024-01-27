import debug from 'debug';
import { Message } from './message';

export interface Device {
  process: (message: Message) => Message[];
}

export class Conjunction implements Device {
  private d = debug('conjunction');
  inputs = new Map<string, boolean>();
  private outputs: { name: string; pulse: boolean }[] = [];

  constructor(outputs: string[]) {
    for (const name of outputs) {
      this.outputs.push({
        name,
        pulse: false,
      });
    }
  }

  process(message: Message): Message[] {
    let pulse = !this.inputs.get(message.from);
    this.inputs.set(message.from, pulse);
    this.d('inputs', this.inputs);

    pulse = Array.from(this.inputs.values()).every((pulse) => pulse)
      ? false
      : true;
    this.d('updated inputs', this.inputs, 'pulse', pulse);

    const from = message.to;
    return this.outputs.map(
      (peer) =>
        new Message({
          from,
          to: peer.name,
          pulse,
        }),
    );
  }
}

export class Broadcaster implements Device {
  private peers: string[];

  constructor(peers: string[]) {
    this.peers = peers;
  }

  process(message: Message): Message[] {
    const from = message.to;
    return this.peers.map(
      (to) =>
        new Message({
          from,
          to,
          pulse: message.pulse,
        }),
    );
  }
}

export class FlipFlop implements Device {
  private d = debug('ff');
  private name: string;
  on = false;
  peers: string[];

  constructor(params: { name: string; peers: string[] }) {
    this.name = params.name;
    this.peers = params.peers;
  }

  process(message: Message): Message[] {
    const result: Message[] = [];
    if (!message.pulse) {
      this.on = !this.on;
      this.d(this.name, 'turned', this.on ? 'on' : 'off');
      this.d('pulse', this.on);
      result.push(
        ...this.peers.map(
          (to) =>
            new Message({
              from: message.to,
              to,
              pulse: this.on,
            }),
        ),
      );
    }
    return result;
  }

  toString(): string {
    return `%${this.name} -> ${this.peers.join(', ')} ${
      this.on ? 'high' : 'low'
    }`;
  }
}

export class Output implements Device {
  process(): Message[] {
    return [];
  }
}

export function parseDevice(spec: string): { name: string; device: Device } {
  if (spec.startsWith('broadcaster')) {
    return {
      name: 'broadcaster',
      device: new Broadcaster(
        spec
          .split('>')[1]
          .split(',')
          .map((name) => name.trim()),
      ),
    };
  } else if (spec.startsWith('%')) {
    const name = spec.slice(1).split(' ')[0];
    const peers = spec
      .split('>')[1]
      .split(',')
      .map((name) => name.trim());
    return { name, device: new FlipFlop({ name, peers }) };
  } else {
    const name = spec.slice(1).split(' ')[0];
    const peers = spec
      .split('>')[1]
      .split(',')
      .map((name) => name.trim());

    return { name, device: new Conjunction(peers) };
  }
}
