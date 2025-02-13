import { describe, test, expect } from 'vitest';
import { HH, type HHCurve } from './hilbertSet';
import { genSVGPath } from './drawHilbertSet';
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
  '', // '0 1',
  '', // '3 1',
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
  '', // '7 4',
  '', // '7 4',
  '', // '0 3',
  '', // '7 3',
  '', // '0 4',
  '', // '0 4',
] as const;

describe('SVG Curve Entry and Exit', () => {
  for (const i of iota(12)) {
    if (thirdOrderEntry[i]) {
      test(`Third Order Curve ${i.toString(10)} has correct Entry`, () => {
        const path = genSVGPath(i as HHCurve, 3, curve[i]);
        expect(extractEntry(path)).toEqual(thirdOrderEntry[i]);
      });
    }

    test(`Third Order Curve ${i.toString(10)} has correct Exit relative to Entry`, () => {
      const path = genSVGPath(i as HHCurve, 3, curve[i]);
      expect(extractRelativeExit(path).join(' ')).toEqual(thirdOrderRelExit[i]);
    });

    test(`Third Order Curve ${i.toString(10)} has correct Exit`, () => {
      const path = genSVGPath(i as HHCurve, 3, curve[i]);
      const entry = extractEntry(path)
        .split(' ')
        .map((x) => parseInt(x, 10)) as Point;
      if (thirdOrderEntry[i])
        expect(
          translate(entry, extractRelativeExit(path), 1, entry).join(' '),
        ).toEqual(thirdOrderExit[i]);
    });

    test(`First Order Curve ${i.toString(10)} has Entry 0, 0`, () => {
      const path = genSVGPath(i as HHCurve, 1, curve[i]);
      expect(extractEntry(path)).toEqual('0 0');
    });

    test(`Second Order Curve ${i.toString(10)} has correct Entry`, () => {
      const path = genSVGPath(i as HHCurve, 2, curve[i]);
      expect(extractEntry(path)).toEqual(secondOrderEntry[i]);
    });

    if (forthOrderEntry[i]) {
      test(`Third Order Curve ${i.toString(10)} has correct Entry`, () => {
        const path = genSVGPath(i as HHCurve, 4, curve[i]);
        expect(extractEntry(path)).toEqual(forthOrderEntry[i]);
      });
    }
  }
});
