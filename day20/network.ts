import debug from 'debug';
import { lcm } from '../util/gcd';
import { Conjunction, Device, FlipFlop, Output, parseDevice } from './devices';
import { Message } from './message';

const dNetwork = debug('network');
const dObserve = debug('observe');

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
        if (
          peerDevice instanceof Conjunction ||
          peerDevice instanceof FlipFlop
        ) {
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
    // dNetwork('Press index', this.pressCount);
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

  /**
   * Only gh outputs to rx.
   * gh needs to remember high for all  inputs to output low.
   *
   * In other words, all primary (rk, cd, zf, qx) inputs send to gh needs to be high
   * for gh to output low to rx.
   *
   * Seems all primary inputs are Conjunctions with exactly
   * one Conjunction input (secondary input).
   *
   * A primary input sends high when the corresponding secondary
   * input sends low to primary.
   *
   * That means all secondary inputs (jj, gf, xz, bz) need to be LOW
   * at the same time.
   *
   * Let's observe.
   */
  rxInputs(): { primary: string[]; secondary: string[] } {
    const primary = (this.getDevice('gh') as Conjunction).getInputs();
    const secondary = primary.map(
      (i) => (this.getDevice(i) as Conjunction).getInputs().at(0)!,
    );
    return { primary, secondary };
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

    // Observe rx inputs
    const { primary, secondary } = this.rxInputs();
    if (
      // From secondary to primary, LOW pulse
      !message.pulse &&
      secondary.includes(message.from) &&
      primary.includes(message.to)
    ) {
      dObserve('count', this.pressCount, message.toString());
      dObserve(
        secondary.map(
          (name) =>
            `${name}: ${(this.getDevice(name) as Conjunction).asBinary()}`,
        ),
      );
      dObserve(
        primary.map(
          (name) =>
            `${name}: ${(this.getDevice(name) as Conjunction).asBinary()}`,
        ),
      );
      Conjunction.lowLogs[message.from].push(this.pressCount);
      if (
        Math.min(
          ...Object.values(Conjunction.lowLogs).map((log) => log.length),
        ) > 5
      ) {
        const cycles: number[] = [];
        for (const [name, logs] of Object.entries(Conjunction.lowLogs)) {
          dObserve(
            name,
            Array.from(logs.entries()).map(
              ([i, count]) =>
                `${count} (+ ${count - (i > 0 ? logs[i - 1] : 0)})`,
            ),
          );
          cycles.push(logs[1] - logs[0]);
        }
        throw new Error(`We are done here ${cycles.reduce(lcm)}`);
      }
    }

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
