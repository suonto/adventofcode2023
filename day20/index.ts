import debug from 'debug';
import { createNetwork } from './network';
import { read } from './read';

(async () => {
  const dMain = debug('main');
  const network = createNetwork(await read('./input.txt'));
  network.pressButton();
  dMain(network.logs[0].join('\n'));
})();
