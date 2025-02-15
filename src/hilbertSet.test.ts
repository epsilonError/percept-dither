import { describe, test, expect } from 'vitest';
import { R, zeroH, fiveH, HH } from './hilbertSet.ts';
import { iota } from './mathUtils.ts';

// Testing Types
type Alphabet = 'u' | 'd' | 'l' | 'r';

// Testing Constants
const order1 = 'urd';
const H2s = [
  'ruluurdrurddldr',
  'lurulurrrdldrdl',
  'dluuurdrurdddlu',
  'druulurrrdlddru',
  'ruluurdrurdddlu',
  'druulurrrdldrdl',
] as const;
const firstOrder = [HH(0)] as const;
const secondOrder = [HH(1), HH(2), HH(3), HH(4), HH(5)] as const;
const thirdOrder = [HH(6), HH(7), HH(8), HH(9), HH(10), HH(11)] as const;
const allCurves = [...firstOrder, ...secondOrder, ...thirdOrder] as const;
const INVALID_ORDERS = [
  -Infinity,
  -10,
  -1,
  -0.5,
  -0,
  Number.NaN,
  0,
  Number.MIN_VALUE,
  Number.EPSILON,
  0.5,
  Number.MAX_VALUE,
  Infinity,
] as const;
const thirdOrderH4s = [
  'luruuldlulddrdlddrurrdldrdlluldluldllurulurrdruuuldllurulurrdruuuldllurulurrdruuuldllurulurrdrurdrurrdldrdllulddrdlddrurdruulurrrdlddrurdruuluruuldllurulurrdrurdrurrdldrdlluldddrurrdldrdlluldddrurrdldrdlluldddrurrdldrdlluldluldllurulurrdruuluruuldlulddrdl',
  'luruuldlulddrdlddrurrdldrdlluldluldllurulurrdruuuldllurulurrdruuuldllurulurrdruuuldllurulurrdrurdrurrdldrdllulddrdlddrurdruulurrrdlddrurdruuluruuldllurulurrdrurdrurrdldrdlluldddrurrdldrdlluldddrurrdldrdlluldlluruuldlulddrdldrdlddrurdruulurrrdlddrurdruulur',
  'rdlddrurdruulurrrdlddrurdruuluruluruuldlulddrdlluldllurulurrdruuuldllurulurrdruuuldllurulurrdrurdrurrdldrdllulddrdlddrurdruulurrrdlddrurdruuluruuldllurulurrdrurdrurrdldrdlluldddrurrdldrdlluldddrurrdldrdlluldlluruuldlulddrdldrdlddrurdruulurrrdlddrurdruulur',
  'ldrddluldluurullldrddluldluuruluruluurdrurddldrrurdrrulurulldluuurdrrulurulldlulldrddluldluuruluruluurdrurddldrrruluurdrurddldrrruluurdrurddldrrruluurdrurddldrdldrddluldluurulldlulldrdldrrurdddlulldrdldrrurdrruluurdrurddldrdldrddluldluurullldrddluldluurul',
  'ruluurdrurddldrddlulldrdldrrurdrurdrrulurulldluuurdrrulurulldluuurdrrulurulldlulldrddluldluuruluruluurdrurddldrrruluurdrurddldrrruluurdrurddldrrruluurdrurddldrdldrddluldluurulldlulldrdldrrurdddlulldrdldrrurdddlulldrdldrrurdrurdrrulurulldluuruluurdrurddldr',
  'ruluurdrurddldrddlulldrdldrrurdrurdrrulurulldluuurdrrulurulldluuurdrrulurulldlulldrddluldluuruluruluurdrurddldrrruluurdrurddldrrruluurdrurddldrrruluurdrurddldrdldrddluldluurulldlulldrdldrrurdddlulldrdldrrurdrruluurdrurddldrdldrddluldluurullldrddluldluurul',
] as const;
const curve6 = [
  '',
  'urd',
  'druulurrrdldrdl',
  'ulddrdlllurulurulurulurrrdlddrurdruulurrrdldrdldrdldrdllluruuld',
  thirdOrderH4s[0],
] as const;

// Testing Utility Functions
function store(word: Iterable<string> | undefined) {
  if (word === undefined) return '';
  return Array.from(word).join('');
}
function iter(word: string) {
  return Array.from(word) as Alphabet[];
}
function Rstring(word: string) {
  return store(R(iter(word)));
}

// Tests
describe('Generated Word Tests', () => {
  test('All Curves are empty for invalid orders', () => {
    for (const curve of allCurves) {
      for (const invalid of INVALID_ORDERS) {
        expect(Array.from(curve(invalid))).toEqual([]);
      }
    }
  });
  test('∀ v, ᵥH₁ is ₀H₁', () => {
    for (const curve of allCurves) {
      expect(store(curve(1))).toEqual(order1);
    }
  });
  test('∀ v ≤ 5, ᵥH₂ is Correct', () => {
    const allSecondOrders = [...firstOrder, ...secondOrder] as const;
    for (const i of iota(allSecondOrders.length)) {
      expect(store(allSecondOrders[i]?.(2))).toEqual(H2s[i]);
    }
  });
  test('∀ v; 5 < v ≤ 11, ᵥH₄ is Correct', () => {
    for (const i of iota(thirdOrder.length)) {
      const a = store(thirdOrder[i]?.(4));
      const b = thirdOrderH4s[i];
      expect(a.slice(0, b?.length)).toEqual(thirdOrderH4s[i]);
    }
  });
  test('∀ v > 5, ᵥH₂ is ₅H₂', () => {
    for (const curve of thirdOrder) {
      expect(store(curve(2))).toEqual(store(fiveH(2)));
    }
  });
  test(`₀H₂ is '${H2s[0]}'`, () => {
    expect(store(zeroH(2))).toEqual(H2s[0]);
  });
  test(`₅H₂ is '${H2s[5]}'`, () => {
    expect(store(fiveH(2))).toEqual(H2s[5]);
  });
  for (const i of iota(4)) {
    test(`₆H(${i.toString(10)}) is '${curve6[i] as string}'`, () => {
      expect(store(thirdOrder[0](i))).toEqual(curve6[i]);
    });
  }
  test('HH(0) is zeroH', () => {
    expect(allCurves[0]).toBe(zeroH);
  });
  test('HH(5) is fiveH', () => {
    expect(allCurves[5]).toBe(fiveH);
  });
  test('Reversion Operator Swaps and Reverses', () => {
    expect(Rstring(order1)).toEqual('uld');
    expect(Rstring(H2s[0])).toEqual('luruuldlulddrdl');
  });
});
