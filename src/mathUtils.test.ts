import { describe, test, expect } from 'vitest';
import {
  mMultiply,
  translate,
  iota,
  replace,
  sVec,
  sMatrix,
  type Point,
  type Matrix,
} from './mathUtils';

describe('Math Utilities', () => {
  describe('Matrix Multiplication', () => {
    test('Flat 2×2 Matrix times 2 Vec', () => {
      expect(mMultiply([1, 2, 3, 4], [0, 0])).toEqual([0, 0]);
    });
    test('Flat 2×2 Matrix times 2 Vec (in place multiplication)', () => {
      const inPlace: Point = [5, 3];
      expect(mMultiply([1, 2, 3, 4], inPlace, inPlace)).toBe(inPlace);
      expect(inPlace).toEqual([11, 27]);
    });
    test('Flat 2×2 Matrix times 2 vec (overwrite multiplication)', () => {
      const inPlace: Point = [5, 3];
      expect(mMultiply([1, 2, 3, 4], [4, 3], inPlace)).toBe(inPlace);
      expect(inPlace).toEqual([10, 24]);
    });
  });
  describe('Vector Translation', () => {
    test('2 Vec translated by 2 Vec', () => {
      expect(translate([0, 1], [1, 1])).toEqual([1, 2]);
      expect(translate([0, 1], [1, 1], 1)).toEqual([1, 2]);
      expect(translate([0, 1], [1, 1], 2)).toEqual([2, 3]);
    });
    test('2 Vec translated by 2 Vec (in place translation)', () => {
      const inPlace: Point = [0, 1];
      expect(translate(inPlace, [1, 1], undefined, inPlace)).toBe(inPlace);
      expect(translate(inPlace, [1, 1], 1, inPlace)).toBe(inPlace);
      expect(translate(inPlace, [1, 1], 2, inPlace)).toBe(inPlace);
      expect(inPlace).toEqual([4, 5]);
    });
    test('2 Vec translated by 2 Vec (overwrite translation)', () => {
      const inPlace: Point = [0, 1];
      expect(translate([1, 1], [1, 1], 1, inPlace)).toBe(inPlace);
      expect(inPlace).toEqual([2, 2]);
    });
  });
  test('Iota (Index/Range Generator)', () => {
    expect(Array.from(iota(0))).toEqual([]);
    expect(Array.from(iota(1))).toEqual([0]);
    expect(Array.from(iota(4))).toEqual([0, 1, 2, 3]);
    expect(Array.from(iota(8))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  test('In Place Replace of Point Values', () => {
    const a: Point = [1, 2];
    const b: Point = [3, 4];
    replace(a, b);
    expect(a).toEqual([3, 4]);
    expect(b).toEqual([1, 2]);
  });
  describe('Scalar Multiplication', () => {
    describe('Scalar × 2 Vec', () => {
      test('Basic', () => {
        expect(sVec(2, [0, 0])).toEqual([0, 0]);
      });
      test('In place multiplication', () => {
        const inPlace: Point = [5, 3];
        expect(sVec(3, inPlace, inPlace)).toBe(inPlace);
        expect(inPlace).toEqual([15, 9]);
      });
      test('Overwrite during multiplication', () => {
        const inPlace: Point = [5, 3];
        expect(sVec(3, [4, 2], inPlace)).toBe(inPlace);
        expect(inPlace).toEqual([12, 6]);
      });
    });
    describe('Scalar times Flat 2×2 Matrix ', () => {
      test('Basic', () => {
        expect(sMatrix(2, [0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
      });
      test('In place multiplication', () => {
        const inPlace: Matrix = [5, 3, 2, 1];
        expect(sMatrix(3, inPlace, inPlace)).toBe(inPlace);
        expect(inPlace).toEqual([15, 9, 6, 3]);
      });
      test('Overwrite during multiplication', () => {
        const inPlace: Matrix = [5, 3, 2, 1];
        expect(sMatrix(3, [8, 6, 4, 2], inPlace)).toBe(inPlace);
        expect(inPlace).toEqual([24, 18, 12, 6]);
      });
    });
  });
});
