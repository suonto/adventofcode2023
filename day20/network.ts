import debug from 'debug';
import { Conjunction, Device, Output, parseDevice } from './devices';
import { Message } from './message';

const dNetwork = debug('network');

export class Network {
  private messages: Message[] = [];
  private logging: boolean = false;
  private pressCount = 0;
  private lowCount = 0;
  private highCount = 0;
  cycle: undefined | number = undefined;
  private cycleLowCount = 0;
  private cycleHighCount = 0;

  constructor(params?: { logging?: boolean }) {
    this.logging = params?.logging ?? false;
  }

  // logs stores array of messages for every button press
  logs: string[][] = [];
  devices = new Map<string, Device>();

  register(specs: string[]): void {
    for (const spec of specs) {
      const { name, device } = parseDevice(spec);
      this.devices.set(name, device);
    }

    for (const [name, device] of this.devices.entries()) {
      // Ensure Outputs are registered
      for (const dest of device.getDestinations()) {
        if (!this.devices.get(dest)) {
          this.devices.set(dest, new Output(dest));
        }
      }

      // Ensure all peers are registered in Conjunction inputs
      device.getDestinations().forEach((destName) => {
        const peerDevice = this.devices.get(destName);
        if (peerDevice instanceof Conjunction) {
          peerDevice.registerInput(name);
        }
      });
    }
  }

  pressMany(times: number): void {
    while (!this.cycle) {
      if (this.pressCount === times) {
        return;
      }
      dNetwork('press count', this.pressCount);
      this.pressButton();
    }
    dNetwork('Cycle length', this.cycle);
    const reminder = (times - this.pressCount) % this.cycle;
    const cycles = (times - this.pressCount - reminder) / this.cycle;
    dNetwork(
      `(1 + ${cycles}`,
      'cycles of',
      this.cycle,
      `(total ${(cycles + 1) * this.cycle})`,
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
    const dProcess = debug('process');
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

    dProcess(this.pressCount, message.toString());
    if (this.logging) this.logs[this.logs.length - 1].push(message.toString());
    this.messages.push(...this.getDevice(message.to).process(message));
    return true;
  }

  getDevice(name: string): Device {
    const device = this.devices.get(name);
    if (!device) throw new Error(`Network cannot find device ${name}`);
    return device;
  }

  debugDevices(): string[] {
    return Array.from(this.devices.values()).map((d) => d.toString());
  }
}
