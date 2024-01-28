import debug from 'debug';
import { Network } from './network';
import { read } from './read';

async function main() {
  const dMain = debug('main');
  const network = new Network({ logging: true });
  const lines = await read('./input.txt');
  network.register(lines);
  dMain(network.debugDevices());

  for (let i = 0; i < 1; i++) network.pressButton();
  // network.pressMany(1000);
  dMain(network.debugDevices());
  dMain(network.count());
  // 563501725 too low
  // 664552384 not the right answer
}

if (require.main === module) {
  main();
}
