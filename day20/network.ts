import debug from 'debug';
import { Conjunction, Device, FlipFlop, Output, parseDevice } from './devices';
import { Message } from './message';

const dNetwork = debug('network');

export class Network {
  private messages: Message[] = [];
  private logging: boolean = false;
  private pressCount = 0;
  private lowCount = 0;
  private highCount = 0;
  private cycle: undefined | number = undefined;
  private cycleLowCount = 0;
  private cycleHighCount = 0;

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

  pressMany(times: number): void {
    while (!this.cycle) {
      if (this.pressCount === times - 1) {
        return;
      }
      this.pressButton();
    }
    dNetwork('Cycle length', this.cycle);
    const reminder = (times - this.pressCount) % this.cycle;
    const cycles = (times - this.pressCount - reminder) / this.cycle;
    dNetwork(
      cycles,
      'cycles of',
      this.cycle,
      'then pressing',
      reminder,
      'times.',
    );
    this.highCount += cycles * this.cycleHighCount;
    this.lowCount += cycles * this.cycleLowCount;
    for (let i = 0; i < reminder; i++) {
      this.pressButton();
    }
  }

  pressButton(): void {
    this.pressCount++;
    this.messages.push(
      new Message({
        to: 'broadcaster',
        from: 'button',
        pulse: false,
      }),
    );

    if (this.logging) this.logs.push([]);
    this.run();

    if (this.cycle === undefined && this.atDefaultState()) {
      this.cycle = this.pressCount;
    }
  }

  private run() {
    while (this.process()) {
      continue;
    }
  }

  count() {
    return this.lowCount * this.highCount;
  }

  atDefaultState(): boolean {
    return Array.from(this.devices.values()).every((d) => d.atDefaultState());
  }

  process(): boolean {
    const message = this.messages.shift();
    if (!message) {
      return false;
    }

    // Keep count how many pulses happen in a cycle
    if (message.pulse) {
      if (!this.cycle) this.cycleHighCount++;
      this.highCount++;
    } else {
      if (!this.cycle) this.cycleLowCount++;
      this.lowCount++;
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
