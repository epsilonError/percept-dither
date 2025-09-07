import { describe, test, expect } from 'vitest';
import { HH, type HHCurve } from './hilbertSet';
import {
  absScale,
  genEntryAndExit,
  genSVGPath,
  type BoundaryVectors,
} from './drawHilbertSet';
import { iota, translate, type Point } from './mathUtils';

function extractEntry(path: string) {
  const relativeStarts = Math.min(path.indexOf('v'), path.indexOf('h'));
  return path.slice(0, relativeStarts).trim().slice(1).trim();
}

function extractRelativeExit(path: string) {
  const relativeStarts = Math.min(path.indexOf('v'), path.indexOf('h'));
  const diff: Point = [0, 0];
  const change: Point = [1, 0];
  const changes = function* () {
    yield* path.slice(relativeStarts).trim().split(' ');
  };
  for (const c of changes()) {
    if (c === 'v') {
      change[0] = 0;
      change[1] = 1;
    } else if (c === 'h') {
      change[0] = 1;
      change[1] = 0;
    } else {
      translate(diff, change, parseInt(c, 10), diff);
    }
  }
  return diff;
}

const curve = [
  HH(0),
  HH(1),
  HH(2),
  HH(3),
  HH(4),
  HH(5),
  HH(6),
  HH(7),
  HH(8),
  HH(9),
  HH(10),
  HH(11),
] as const;
const secondOrderEntry = [
  '0 0',
  '1 0',
  '1 1',
  '0 1',
  '0 0',
  '0 1',
  '0 1',
  '0 1',
  '0 1',
  '0 1',
  '0 1',
  '0 1',
] as const;
const thirdOrderEntry = [
  '0 0',
  '3 0',
  '3 3',
  '0 3',
  '0 0',
  '0 3',
  '3 2',
  '3 2',
  '0 1',
  '3 1',
  '0 2',
  '0 2',
] as const;
const thirdOrderRelExit = [
  '7 0',
  '1 0',
  '1 0',
  '7 0',
  '4 3',
  '4 -3',
  '1 0',
  '4 -1',
  '7 0',
  '1 0',
  '7 0',
  '4 -1',
] as const;
const thirdOrderExit = [
  '7 0',
  '4 0',
  '4 3',
  '7 3',
  '4 3',
  '4 0',
  '4 2',
  '7 1',
  '7 1',
  '4 1',
  '7 2',
  '4 1',
] as const;
const forthOrderEntry = [
  '0 0',
  '7 0',
  '7 7',
  '0 7',
  '0 0',
  '0 7',
  '7 4',
  '7 4',
  '0 3',
  '7 3',
  '0 4',
  '0 4',
] as const;
const forthOrderExit = [
  '15 0',
  '8 0',
  '8 7',
  '15 7',
  '8 7',
  '8 0',
  '8 4',
  '15 3',
  '15 3',
  '8 3',
  '15 4',
  '8 3',
] as const;
const boundaryVectorsOrder3: Partial<BoundaryVectors>[] = [
  { entry: [0, 0], exit: [1, 0] } as const,
  { entry: [0.5, 0], exit: [0.5, 0] } as const,
  { entry: [0.5, 0.5], exit: [0.5, 0.5] } as const,
  { entry: [0, 0.5], exit: [1, 0.5] } as const,
  { entry: [0, 0], exit: [0.5, 0.5] } as const,
  { entry: [0, 0.5], exit: [0.5, 0] } as const,
  { entry: [0.5, 0.25], exit: [0.5, 0.25] } as const,
  { entry: [0.5, 0.25], exit: [1, 0.25] } as const,
  { entry: [0, 0.25], exit: [1, 0.25] } as const,
  { entry: [0.5, 0.25], exit: [0.5, 0.25] } as const,
  { entry: [0, 0.25], exit: [1, 0.25] } as const,
  { entry: [0, 0.25], exit: [0.5, 0.25] } as const,
] as const;

describe('SVG Curve Entry and Exit', () => {
  for (const cNum of iota(12)) {
    if (thirdOrderEntry[cNum])
      test(`Third Order Curve ${cNum.toString(10)} has correct Entry`, () => {
        const path = genSVGPath(cNum as HHCurve, 3, curve[cNum]);
        expect(extractEntry(path)).toEqual(thirdOrderEntry[cNum]);
      });

    test(`Third Order Curve ${cNum.toString(10)} has correct Exit relative to Entry`, () => {
      const path = genSVGPath(cNum as HHCurve, 3, curve[cNum]);
      expect(extractRelativeExit(path).join(' ')).toEqual(
        thirdOrderRelExit[cNum],
      );
    });

    if (thirdOrderExit[cNum])
      test(`Third Order Curve ${cNum.toString(10)} has correct Exit`, () => {
        const path = genSVGPath(cNum as HHCurve, 3, curve[cNum]);
        const entry = extractEntry(path)
          .split(' ')
          .map((x) => parseInt(x, 10)) as Point;
        if (thirdOrderEntry[cNum])
          expect(
            translate(entry, extractRelativeExit(path), 1, entry).join(' '),
          ).toEqual(thirdOrderExit[cNum]);
        // TODO: Add Exit Point test using absScale
      });

    if (forthOrderExit[cNum])
      test(`Forth Order Curve ${cNum.toString(10)} has correct Exit`, () => {
        const path = genSVGPath(cNum as HHCurve, 4, curve[cNum]);
        const entry = extractEntry(path)
          .split(' ')
          .map((x) => parseInt(x, 10)) as Point;
        if (forthOrderEntry[cNum])
          expect(
            translate(entry, extractRelativeExit(path), 1, entry).join(' '),
          ).toEqual(forthOrderExit[cNum]);
        // TODO: Add Exit Point test using absScale
      });

    test(`First Order Curve ${cNum.toString(10)} has Entry 0, 0`, () => {
      const path = genSVGPath(cNum as HHCurve, 1, curve[cNum]);
      expect(extractEntry(path)).toEqual('0 0');
    });

    test(`Second Order Curve ${cNum.toString(10)} has correct Entry`, () => {
      const path = genSVGPath(cNum as HHCurve, 2, curve[cNum]);
      expect(extractEntry(path)).toEqual(secondOrderEntry[cNum]);
    });

    if (forthOrderEntry[cNum])
      test(`Forth Order Curve ${cNum.toString(10)} has correct Entry`, () => {
        const path = genSVGPath(cNum as HHCurve, 4, curve[cNum]);
        expect(extractEntry(path)).toEqual(forthOrderEntry[cNum]);
      });

    if (boundaryVectorsOrder3[cNum]?.entry)
      test(`Curve ${cNum.toString(10)} has correct Entry Vectors`, () => {
        expect(genEntryAndExit(cNum as HHCurve, 3).entry).toEqual(
          boundaryVectorsOrder3[cNum]?.entry,
        );
      });
    if (boundaryVectorsOrder3[cNum]?.exit)
      test(`Curve ${cNum.toString(10)} has correct Exit Vectors`, () => {
        expect(genEntryAndExit(cNum as HHCurve, 3).exit).toEqual(
          boundaryVectorsOrder3[cNum]?.exit,
        );
      });

    test(`Zero order Curve ${cNum.toString(10)} has [0, 0] Entry and Exit`, () => {
      expect(genEntryAndExit(cNum as HHCurve, 0)).toEqual({
        entry: [0, 0],
        exit: [0, 0],
      });
    });

    test(`First order Curve ${cNum.toString(10)} has ₀H Entry and Exit`, () => {
      expect(genEntryAndExit(cNum as HHCurve, 1)).toEqual(
        boundaryVectorsOrder3[0],
      );
    });

    if (cNum !== 0)
      test(`Second order Curve ${cNum.toString(10)} does not have ₀H Entry and Exit`, () => {
        expect(genEntryAndExit(cNum as HHCurve, 2)).not.toEqual(
          boundaryVectorsOrder3[0],
        );
      });

    if (cNum >= 5)
      test(`Second order Curve ${cNum.toString(10)} has ₅H Entry and Exit`, () => {
        expect(genEntryAndExit(cNum as HHCurve, 2)).toEqual(
          boundaryVectorsOrder3[5],
        );
      });

    if (cNum > 5)
      test(`Third order Curve ${cNum.toString(10)} does not have ₅H Entry and Exit`, () => {
        expect(genEntryAndExit(cNum as HHCurve, 3)).not.toEqual(
          boundaryVectorsOrder3[5],
        );
      });

    for (const order of iota(6)) {
      if (order > 0)
        describe(`Absolute placement of Entry and Exit`, () => {
          describe(`${order.toString(10)} order of Curve ${cNum.toString(10)}`, () => {
            const path = genSVGPath(cNum as HHCurve, order, curve[cNum]);
            const entryPoint = extractEntry(path)
              .split(' ')
              .map((x) => parseInt(x, 10)) as Point;
            const relativeExit = extractRelativeExit(path);
            const exitPoint = translate(entryPoint, relativeExit);
            const { entry, exit } = genEntryAndExit(cNum as HHCurve, order);

            test(`SVG Entry matches Absolute Scaled Entry`, () => {
              expect(entryPoint).toEqual(
                absScale(entry, order, 'q0', cNum as HHCurve),
              );
            });
            test(`SVG Exit matches Absolute Scaled Exit`, () => {
              expect(exitPoint).toEqual(
                absScale(exit, order, 'q3', cNum as HHCurve),
              );
            });
          });
        });
    }
  }
});
