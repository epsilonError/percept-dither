import { describe, expect, test } from 'vitest';
import { hilbertCurve, hilbertPositions } from './hilbertCurve.ts';
import { gilbertPositions } from './gilbertCurve.ts';

type Position = [number, number];
interface Traversal {
  src: Position;
  dest: Position;
}
function* countArrayValues<K, V>(iterator: Iterable<[K, V[]]>) {
  for (const [k, v] of iterator) {
    yield [k, v.length] as [K, number];
  }
}

const sizes: Position[] = [
  [583, 623],
  [777, 666],
];

describe('Space Coverage', () => {
  for (const [width, height] of sizes) {
    describe(`Size ${width.toString(10)}×${height.toString(10)}`, () => {
      describe('Hilbert Curve', () => {
        /** The number of times a Position has been visited */
        const counter = new Map<Position, number>();
        /** Distance traveled in a single step and the traversals that did */
        const distanceStepped = new Map<number, Traversal[]>();
        /** Traversals that changed 2, or 0, axis in a single step */
        const not1AxisChange: Traversal[] = [];

        let oldX = -1,
          oldY = 0;
        for (const pos of hilbertPositions(width, height)) {
          const [x, y] = pos;
          const traverse: Traversal = { src: [oldX, oldY], dest: pos };
          const Δx = Math.abs(oldX - x),
            Δy = Math.abs(oldY - y),
            d = Math.sqrt(Δx ** 2 + Δy ** 2);

          // Collect visits
          counter.set(pos, counter.get(pos) ?? 0 + 1);

          // Collect distances traveled in a single step
          const update = distanceStepped.get(d) ?? [];
          update.push(traverse);
          distanceStepped.set(d, update);

          // Steps should change either X or Y position, not neither nor both
          if (!(Δx ^ Δy)) {
            not1AxisChange.push(traverse);
          }

          oldX = x;
          oldY = y;
        }
        test('Equivalent number of Pixels and Positions', () => {
          expect(counter.size).toEqual(width * height);
        });
        test('Positions have only been visited once', () => {
          expect(
            Array.from(counter.entries()).filter((e) => e[1] !== 1),
          ).toEqual([]);
        });
        describe('Space Traversal', () => {
          /* Check that successive positions are only one point apart (fails to test edges) */
          test('Only 1 of X or Y should change per traversal', () => {
            expect(not1AxisChange).toEqual([]);
          });
          test('Steps of length 1 are the majority', () => {
            let length1 = 0,
              lengthOther = 0;
            for (const [distance, c] of countArrayValues(distanceStepped)) {
              if (distance === 1) {
                length1 += c;
              } else {
                lengthOther += c;
              }
            }
            expect(length1).toBeGreaterThan(lengthOther);
            expect(length1 / lengthOther).toBeGreaterThan(0.5);
            expect(lengthOther / (length1 + lengthOther)).toBeLessThan(0.001);
          });
        });
      });

      describe('Gilbert Curve', () => {
        /** The number of times a Position has been visited */
        const counter = new Map<Position, number>();
        /** Distance traveled in a single step and the traversals that did */
        const distanceStepped = new Map<number, Traversal[]>();
        /** Traversals that changed 2, or 0, axis in a single step */
        const not1AxisChange: Traversal[] = [];

        let oldX = -1,
          oldY = 0;
        for (const pos of gilbertPositions(width, height)) {
          const [x, y] = pos;
          const traverse: Traversal = { src: [oldX, oldY], dest: pos };
          const Δx = Math.abs(oldX - x),
            Δy = Math.abs(oldY - y),
            d = Math.sqrt(Δx ** 2 + Δy ** 2);

          // Collect visits
          counter.set(pos, counter.get(pos) ?? 0 + 1);

          // Collect distances traveled in a single step
          const update = distanceStepped.get(d) ?? [];
          update.push(traverse);
          distanceStepped.set(d, update);

          // Steps should change either X or Y position, not neither nor both
          if (!(Δx ^ Δy)) {
            not1AxisChange.push(traverse);
          }

          oldX = x;
          oldY = y;
        }
        test('Equivalent number of Pixels and Positions', () => {
          expect(counter.size).toEqual(width * height);
        });
        test('Positions have only been visited once', () => {
          expect(
            Array.from(counter.entries()).filter((e) => e[1] !== 1),
          ).toEqual([]);
        });
        describe('Space Traversal', () => {
          /* Check that successive positions are only one point apart (fails to test edges) */
          test('Only 1 of X or Y should change per traversal', () => {
            if (width % 2 && !(height % 2)) {
              expect(not1AxisChange.length).toBeLessThanOrEqual(1);
              expect(not1AxisChange).toEqual([
                {
                  dest: [776, 663],
                  src: [775, 664],
                },
              ]);
            } else {
              expect(not1AxisChange).toEqual([]);
            }
          });
          test('Steps of length 1 are the majority', () => {
            let length1 = 0,
              lengthOther = 0;
            for (const [distance, c] of countArrayValues(distanceStepped)) {
              if (distance === 1) {
                length1 += c;
              } else {
                lengthOther += c;
              }
            }
            expect(length1).toBeGreaterThan(lengthOther);
            expect(length1 / lengthOther).toBeGreaterThan(0.99999);
            expect(lengthOther / (length1 + lengthOther)).toBeLessThan(0.00001);
          });
        });
      });
    });
  }
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
