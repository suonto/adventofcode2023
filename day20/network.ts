import debug from 'debug';
import { Device, parseDevice } from './devices';
import { Message } from './message';

const dNetwork = debug('network');

export class Network {
  private messages: Message[] = [];

  // logs stores array of messages for every button press
  logs: string[][] = [];
  devices = new Map<string, Device>();

  register(spec: string): void {
    const { name, device } = parseDevice(spec);
    this.devices.set(name, device);
  }

  pressButton(): void {
    this.messages.push(
      new Message({
        to: 'broadcaster',
        from: 'button',
        pulse: false,
      }),
    );

    this.logs.push([]);
    this.run();
  }

  private run() {
    while (this.process()) {
      continue;
    }
  }

  process(): boolean {
    const message = this.messages.shift();
    dNetwork('process', message);
    if (!message) {
      return false;
    }
    this.logs[this.logs.length - 1].push(message.toString());
    this.messages.push(...this.getDevice(message.to).process(message));
    return true;
  }

  private getDevice(name: string): Device {
    const device = this.devices.get(name);
    if (!device) throw new Error(`Network cannot find device ${name}`);
    return device;
  }
}

export function createNetwork(lines: string[]): Network {
  const network = new Network();
  for (const line of lines) {
    network.register(line);
  }

  return network;
}
