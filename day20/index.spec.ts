import { describe, expect, test } from '@jest/globals';
import debug from 'debug';
import { createNetwork } from './network';

const dTest = debug('test');

const example1Input = `broadcaster -> a, b, c
%a -> b
%b -> c
%c -> inv
&inv -> a`;

const example1Output = `button -low-> broadcaster
broadcaster -low-> a
broadcaster -low-> b
broadcaster -low-> c
a -high-> b
b -high-> c
c -high-> inv
inv -low-> a
a -low-> b
b -low-> c
c -low-> inv
inv -high-> a`;

describe('Network', () => {
  test('Example 1', () => {
    const network = createNetwork(example1Input.split('\n'));
    dTest(network.devices);

    // 1st press
    network.pressButton();
    expect(network.logs[0].join('\n')).toBe(example1Output);

    // 2nd press
    network.pressButton();
    expect(network.logs[1].join('\n')).toBe(example1Output);
  });
});
