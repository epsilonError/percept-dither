import { describe, expect, test } from 'vitest';
import { hilbertCurve, positions } from './spaceCurve.ts';

const [width, height] = [583, 623];

describe('Space Coverage', () => {
  describe(`Size ${width.toString(10)}×${height.toString(10)}`, () => {
    const counter = new Map<[number, number], number>();
    for (const c of positions(width, height)) {
      counter.set(c, counter.get(c) ?? 0 + 1);
    }
    test('Equivalent Pixels and Positions', () => {
      expect(counter.size).toEqual(width * height);
    });
    test('Positions have only been visited once', () => {
      expect(Array.from(counter.entries()).filter((e) => e[1] !== 1)).toEqual(
        [],
      );
    });
  });
});

describe('Hilbert Curve Traversal Counts', () => {
  function countGos(a: Iterable<string>) {
    return Array.from(a).filter((c) => c === '▶').length;
  }
  // Decker maxes out at 4096² pixels, i.e. 12th order traversal
  for (const order of [0, 1, 2, 3, 5, 7] as const) {
    const expected = 2 ** (2 * order) - 1;
    test(`${order.toString(10)} order has ${expected.toString(10)} traversals`, () => {
      expect(countGos(hilbertCurve(order))).toEqual(expected);
    });
  }
});
