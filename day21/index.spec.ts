import { describe, expect, test } from '@jest/globals';
import debug from 'debug';
import { Garden } from './garden';

const dTest = debug('test');

const input = `...........
.....###.#.
.###.##..#.
..#.#...#..
....#.#....
.##..S####.
.##..#...#.
.......##..
.##.#.####.
.##..##.##.
...........`;

const step1Output = `...........
.....###.#.
.###.##..#.
..#.#...#..
....#O#....
.##.OS####.
.##..#...#.
.......##..
.##.#.####.
.##..##.##.
...........`;

const step2Output = `...........
.....###.#.
.###.##..#.
..#.#O..#..
....#.#....
.##O.O####.
.##.O#...#.
.......##..
.##.#.####.
.##..##.##.
...........`;

const step3Output = `...........
.....###.#.
.###.##..#.
..#.#.O.#..
...O#O#....
.##.OS####.
.##O.#...#.
....O..##..
.##.#.####.
.##..##.##.
...........`;

describe('Garden', () => {
  test('Step 1', () => {
    const garden = new Garden(input.split('\n'));
    

    // dTest(network.debugDevices());

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
    expect(con.inputs.get('a')).toBeTruthy();
    expect(con.inputs.get('b')).toBeTruthy();

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
