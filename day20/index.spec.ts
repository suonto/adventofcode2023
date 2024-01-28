import { describe, expect, test } from '@jest/globals';
import debug from 'debug';
import { Conjunction, FlipFlop } from './devices';
import { Network } from './network';

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

const example2Input = `broadcaster -> a
%a -> inv, con
&inv -> b
%b -> con
&con -> output`;

const example2Out1st = `button -low-> broadcaster
broadcaster -low-> a
a -high-> inv
a -high-> con
inv -low-> b
con -high-> output
b -high-> con
con -low-> output`;

const example2Out2nd = `button -low-> broadcaster
broadcaster -low-> a
a -low-> inv
a -low-> con
inv -high-> b
con -high-> output`;

const example2Out3rd = `button -low-> broadcaster
broadcaster -low-> a
a -high-> inv
a -high-> con
inv -low-> b
con -low-> output
b -low-> con
con -high-> output`;

const example2Out4th = `button -low-> broadcaster
broadcaster -low-> a
a -low-> inv
a -low-> con
inv -high-> b
con -high-> output`;

describe('Network', () => {
  test('Example 1', () => {
    const network = new Network({ logging: true });
    network.register(example1Input.split('\n'));
    dTest(network.debugDevices());

    // 1st press
    network.pressButton();
    expect(network.logs[0].join('\n')).toBe(example1Output);

    // 2nd press
    network.pressButton();
    expect(network.logs[1].join('\n')).toBe(example1Output);
  });

  test('Example 1: 1000 times', () => {
    const network = new Network();
    network.register(example1Input.split('\n'));
    dTest(network.debugDevices());

    network.pressMany(1000);
    expect(network.count()).toBe(32000000);
  });

  test('Example 2', () => {
    const network = new Network({ logging: true });
    network.register(example2Input.split('\n'));
    dTest(network.debugDevices());

    const con = network.getDevice('con')! as Conjunction;
    const inv = network.getDevice('inv')! as Conjunction;

    dTest('1st');
    network.pressButton();
    expect(network.logs[0].join('\n')).toBe(example2Out1st);
    expect((network.getDevice('a') as FlipFlop).on).toBeTruthy();
    expect((network.getDevice('b') as FlipFlop).on).toBeTruthy();
    expect(
      Array.from(
        (network.getDevice('con') as Conjunction).inputs.values(),
      ).every((pulse) => pulse),
    ).toBeTruthy();

    dTest('2nd');
    network.pressButton();
    expect(network.logs[1].join('\n')).toBe(example2Out2nd);
    expect((network.getDevice('a') as FlipFlop).on).toBeFalsy();
    expect((network.getDevice('b') as FlipFlop).on).toBeTruthy();
    expect(con.inputs.get('a')).toBeFalsy();
    expect(con.inputs.get('b')).toBeTruthy();

    dTest('3rd');
    network.pressButton();
    expect(network.logs[2].join('\n')).toBe(example2Out3rd);
    expect((network.getDevice('a') as FlipFlop).on).toBeTruthy();
    expect((network.getDevice('b') as FlipFlop).on).toBeFalsy();
    expect(con.inputs.get('a')).toBeTruthy();
    expect(con.inputs.get('b')).toBeFalsy();

    dTest('4th');
    network.pressButton();
    expect(network.logs[3].join('\n')).toBe(example2Out4th);
    expect((network.getDevice('a') as FlipFlop).on).toBeFalsy();
    expect((network.getDevice('b') as FlipFlop).on).toBeFalsy();
    expect(con.inputs.get('a')).toBeFalsy();
    expect(con.inputs.get('b')).toBeFalsy();
    expect(inv.inputs.get('a')).toBeFalsy();
  });

  test('Example 2: 1000 times', () => {
    const network = new Network();
    network.register(example2Input.split('\n'));
    dTest(network.debugDevices());

    network.pressMany(1000);
    expect(network.cycle).toBe(4);
    expect(network.count()).toBe(11687500);
  });
});
