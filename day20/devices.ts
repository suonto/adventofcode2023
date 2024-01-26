import { Message } from './message';

export interface Device {
  process: (message: Message) => Message[];
}

export class Conjunction implements Device {
  private inputs = new Map<string, boolean>();
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

    pulse = Array.from(this.inputs.values()).every((pulse) => pulse)
      ? false
      : true;

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
  private name: string;
  private on = false;
  private peer: string;

  constructor(params: { name: string; peer: string }) {
    this.name = params.name;
    this.peer = params.peer;
  }

  process(message: Message): Message[] {
    const result: Message[] = [];
    if (!message.pulse) {
      this.on = !this.on;
      result.push(
        new Message({
          from: message.to,
          to: this.peer,
          pulse: this.on,
        }),
      );
    }
    return result;
  }

  toString(): string {
    return `%${this.name} -> ${this.peer} ${this.on ? 'high' : 'low'}`;
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
    const peer = spec.split('>')[1].trim();
    return { name, device: new FlipFlop({ name, peer }) };
  } else {
    const name = spec.slice(1).split(' ')[0];
    const peers = spec
      .split('>')[1]
      .split(',')
      .map((name) => name.trim());

    return { name, device: new Conjunction(peers) };
  }
}
