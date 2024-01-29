import debug from 'debug';
import { Network } from './network';
import { read } from './read';

async function main() {
  const dMain = debug('main');
  const network = new Network({ logging: true });
  const lines = await read('./input.txt');
  network.register(lines);
  dMain(network.debugDevices());

  while (true) {
    network.pressButton();
  }
}

if (require.main === module) {
  main();
}
