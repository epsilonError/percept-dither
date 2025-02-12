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
const thirdOrderEntry = [
  '0 0',
  '', // '3 0',
  '', // '3 3',
  '', // '0 3',
  '0 0',
  '', // '0 3',
  '', // '3 2',
  '', // '3 2',
  '', // '0 1',
  '', // '3 1',
  '', // '0 2',
  '', // '0 2',
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
  }
});
