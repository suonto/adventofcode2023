import debug from 'debug';
import { Message } from './message';

export interface Device {
  process: (message: Message) => Message[];
  atDefaultState: () => boolean;
  getDestinations: () => string[];
  toString: () => string;
  name: string;
}

export class Conjunction implements Device {
  static lowLogs = {
    jj: [] as number[],
    gf: [] as number[],
    xz: [] as number[],
    bz: [] as number[],
  };
  name: string;
  private d = debug('conjunction');
  private inputs = new Map<string, boolean>();
  private destinations: { name: string; pulse: boolean }[] = [];

  constructor(params: { name: string; destinations: string[] }) {
    this.name = params.name;
    for (const destName of params.destinations) {
      this.destinations.push({
        name: destName,
        pulse: false,
      });
    }
  }

  getInputs() {
    return Array.from(this.inputs.keys());
  }

  registerInput(name: string): void {
    this.inputs.set(name, false);
  }

  getDestinations(): string[] {
    return this.destinations.map((d) => d.name);
  }

  atDefaultState(): boolean {
    return Array.from(this.inputs.values()).every((pulse) => !pulse);
  }

  process(message: Message): Message[] {
    this.inputs.set(message.from, message.pulse);

    const pulse = Array.from(this.inputs.values()).every((pulse) => pulse)
      ? false
      : true;

    this.d(this.toString(), 'sending', pulse);

    const from = message.to;
    return this.destinations.map(
      (peer) =>
        new Message({
          from,
          to: peer.name,
          pulse,
        }),
    );
  }

  toString(): string {
    const inputs = Array.from(this.inputs.entries())
      .map((input) => `${input[0]}:${input[1] ? 'h' : 'l'}`)
      .join(', ');
    return `Conjunction ${this.name} [${inputs}] -> ${this.destinations
      .map((d) => d.name)
      .join(', ')}`;
  }

  asBinary(): string {
    return Array.from(this.inputs.values())
      .map((pulse) => (pulse ? '1' : '0'))
      .join('');
  }
}

export class Broadcaster implements Device {
  private destinations: string[];

  constructor(destinations: string[]) {
    this.destinations = destinations;
  }
  name: string;
  getDestinations(): string[] {
    return this.destinations;
  }

  atDefaultState(): boolean {
    return true;
  }

  process(message: Message): Message[] {
    const from = message.to;
    return this.destinations.map(
      (to) =>
        new Message({
          from,
          to,
          pulse: message.pulse,
        }),
    );
  }

  toString() {
    return `Broadcaster -> ${this.destinations.join(', ')}`;
  }
}

export class FlipFlop implements Device {
  private d = debug('ff');
  name: string;
  on = false;
  peers: string[];
  private inputs: string[] = [];

  registerInput(name: string): void {
    this.inputs.push(name);
  }

  getInputs() {
    return this.inputs;
  }

  constructor(params: { name: string; peers: string[] }) {
    this.name = params.name;
    this.peers = params.peers;
  }

  getDestinations(): string[] {
    return this.peers;
  }

  atDefaultState(): boolean {
    return !this.on;
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
    return `FlipFlop ${this.name} [${this.inputs.join(', ')}]:${
      this.on ? 'h' : 'l'
    } -> ${this.peers.join(', ')}`;
  }
}

export class Output implements Device {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  getDestinations(): string[] {
    return [];
  }
  atDefaultState() {
    return true;
  }
  process(): Message[] {
    return [];
  }
  toString() {
    return `Output ${this.name}`;
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
    const destinations = spec
      .split('>')[1]
      .split(',')
      .map((destName) => destName.trim());

    return { name, device: new Conjunction({ name, destinations }) };
  }
}
