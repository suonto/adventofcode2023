import debug from 'debug';
import { Conjunction, Device, FlipFlop, Output, parseDevice } from './devices';
import { Message } from './message';

const dNetwork = debug('network');

export class Network {
  private messages: Message[] = [];
  private logging: boolean = false;
  private lowCount = 0;
  private highCount = 0;

  constructor(params?: { logging?: boolean }) {
    this.logging = params?.logging ?? false;
  }

  // logs stores array of messages for every button press
  logs: string[][] = [];
  devices = new Map<string, Device>();

  register(spec: string): void {
    // Add output once if needed
    if (spec.endsWith('output') && !this.devices.get('output')) {
      this.devices.set('output', new Output());
    }
    const { name, device } = parseDevice(spec);
    this.devices.set(name, device);

    // Ensure FlipFlop peers are registered in Conjunction inputs
    if (device instanceof Conjunction || device instanceof FlipFlop) {
      for (const [name, device] of this.devices.entries()) {
        if (device instanceof FlipFlop) {
          device.peers.forEach((p) => {
            const peerDevice = this.devices.get(p);
            if (peerDevice instanceof Conjunction) {
              peerDevice.inputs.set(name, false);
            }
          });
        }
      }
    }
  }

  pressButton(): void {
    this.messages.push(
      new Message({
        to: 'broadcaster',
        from: 'button',
        pulse: false,
      }),
    );

    if (this.logging) this.logs.push([]);
    this.run();
  }

  private run() {
    while (this.process()) {
      continue;
    }
  }

  count() {
    return this.lowCount * this.highCount;
  }

  process(): boolean {
    const message = this.messages.shift();
    if (!message) {
      return false;
    }
    if (message.pulse) {
      this.lowCount++;
    } else {
      this.highCount++;
    }
    dNetwork('process', message.toString());
    if (this.logging) this.logs[this.logs.length - 1].push(message.toString());
    this.messages.push(...this.getDevice(message.to).process(message));
    return true;
  }

  getDevice(name: string): Device {
    const device = this.devices.get(name);
    if (!device) throw new Error(`Network cannot find device ${name}`);
    return device;
  }
}
