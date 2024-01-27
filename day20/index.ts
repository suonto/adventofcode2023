import debug from 'debug';
import { Network } from './network';
import { read } from './read';

async function main() {
  const dMain = debug('main');
  const network = new Network({ logging: true });
  const lines = await read('./input.txt');
  lines.map((l) => network.register(l));

  network.pressMany(1000);
  dMain(network.count());
}

if (require.main === module) {
  main();
}
