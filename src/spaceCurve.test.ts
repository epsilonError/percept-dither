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
    describe('Space Traversal', () => {
      type Position = [number, number];
      interface Traversal {
        src: Position;
        dest: Position;
      }
      /* Check that successive positions are only one point apart (fails to test edges) */
      const distanceStepped = new Map<number, Traversal[]>();
      const not1AxisChange: Traversal[] = [];
      let oldX = -1,
        oldY = 0;
      for (const [x, y] of positions(width, height)) {
        const traverse: Traversal = { src: [oldX, oldY], dest: [x, y] };
        const Δx = Math.abs(oldX - x),
          Δy = Math.abs(oldY - y),
          d = Math.sqrt(Δx ** 2 + Δy ** 2);

        // Collect distances traveled in a single step
        const update = distanceStepped.get(d) ?? [];
        update.push(traverse);
        distanceStepped.set(d, update);

        if (!(Δx ^ Δy)) {
          // Steps should change either X or Y position, not neither nor both
          not1AxisChange.push(traverse);
        }
        oldX = x;
        oldY = y;
      }
      test('Only 1 of X or Y should change per traversal', () => {
        expect(not1AxisChange).toEqual([]);
      });
      function* count<K, V>(iterator: Iterable<[K, V[]]>) {
        for (const [k, v] of iterator) {
          yield [k, v.length] as [K, number];
        }
      }
      test('Steps of length 1 are the majority', () => {
        let distance1 = 0,
          distanceOther = 0;
        for (const [distance, c] of count(distanceStepped)) {
          if (distance === 1) {
            distance1 += c;
          } else {
            distanceOther += c;
          }
        }
        expect(distance1).toBeGreaterThan(distanceOther);
        expect(distance1 / distanceOther).toBeGreaterThan(0.5);
        expect(distanceOther / (distance1 + distanceOther)).toBeLessThan(0.001);
      });
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
    test(`${order.toString(10)} order has (2^${(2 * order).toString(10)})-1 traversals`, () => {
      expect(countGos(hilbertCurve(order))).toEqual(expected);
    });
  }
});
