import { describe, test, expect } from 'vitest';
import {
  registerColorSpaces,
  okLrPos,
  sRGBgrayscale,
  eightBitGray,
  deltaEOKLr2,
  type Position,
} from './perceptualSpace.ts';
import {
  to as convert,
  parse,
  sRGB,
  OKLrab,
  type PlainColorObject,
  serialize,
} from 'colorjs.io/fn';

describe('Color Conversion', () => {
  registerColorSpaces();
  const colorName = 'red';
  // Parse Color
  const color = parse(colorName);
  // Convert to perceptual space
  const inPercept = convert(color, OKLrab);
  // Only keep Lightness Axis
  const grayPercept: PlainColorObject = {
    ...inPercept,
    coords: [inPercept.coords[0], 0, 0],
  };
  // Convert back to sRGB grayscale
  const grayscale = convert(grayPercept, sRGB, { inGamut: true });
  // 8-bit Value in base10
  const eightBitGrayValue = eightBitGray(grayscale.coords);
  test(`${colorName} sRGB Coord`, () => {
    expect(color.coords).toEqual([1, 0, 0]);
  });
  test(`${colorName} Perceptual Space Coord`, () => {
    expect(inPercept.coords).toEqual([
      0.5680846563197034, 0.2248630684262744, 0.125846277330585,
    ]);
  });
  test(`${colorName} Perceptual Grayscale Coord`, () => {
    expect(grayPercept.coords).toEqual([inPercept.coords[0], 0, 0]);
    expect(okLrPos(color.coords as Position)).toEqual(inPercept.coords[0]);
  });
  test(`${colorName} sRGB Grayscale Coord`, () => {
    expect(grayscale.coords).toEqual([
      0.5347438596284484, 0.534743859628448, 0.534743859628448,
    ]);
  });
  test(`${colorName} 8-bit sRGB Grayscale Value`, () => {
    expect(eightBitGrayValue).toEqual(136);
    expect(sRGBgrayscale(color.coords as Position)).toEqual(136);
  });
  test(`${colorName} Grayscale Serialized Hex Code`, () => {
    expect(serialize(grayscale, { format: 'hex' })).toEqual('#888');
  });
  test(`${colorName} deltaEOKLr2 (color & gray)`, () => {
    expect(
      deltaEOKLr2(inPercept.coords as Position, grayPercept.coords as Position),
    ).toEqual(0.5153666076107216);
  });
});

describe('OKLr Grays in sRGB', () => {
  test('OKLr middle point in sRGB is (119 / #777)', () => {
    /* The middle point is all you need for 1-bit dither */
    const middleGray = { space: OKLrab, coords: [0.5, 0, 0] as Position };
    const middleSRGBGray = convert(middleGray, sRGB, { inGamut: true });
    expect(middleGray.coords).toEqual([0.5, 0, 0]);
    expect(middleSRGBGray.coords).toEqual([
      0.466180790779591, 0.46618079077959046, 0.4661807907795907,
    ]);
    expect(eightBitGray(middleSRGBGray.coords)).toEqual(119);
    expect(serialize(middleSRGBGray, { format: 'hex' })).toEqual('#777');
  });
  console.log('\n===== 16 evenly spaced OKLr Grays in sRGB =====');
  const grays16: Map<number, number> = new Map<number, number>();
  for (let i = 15; i >= 0; i--) {
    const gray = { space: OKLrab, coords: [i / 15, 0, 0] as Position };
    const sRGBGray =
      i === 15
        ? convert(gray, sRGB, { inGamut: { space: sRGB, method: 'clip' } })
        : convert(gray, sRGB, { inGamut: true });
    console.log(
      `${Math.abs(i - 16).toString(10)}.`,
      'sRGB Gray Value:',
      eightBitGray(sRGBGray.coords),
      'Hexcode:',
      serialize(sRGBGray, { format: 'hex' }),
    );
    grays16.set(eightBitGray(sRGBGray.coords), gray.coords[0]);
  }

  const errors: number[] = [];
  for (let i = 0; i < 256; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const grayLr = convert(
      { space: sRGB, coords: [i / 255, i / 255, i / 255] },
      OKLrab,
      { inGamut: true },
    ).coords[0]!;
    const diff =
      grayLr -
      (grays16.has(i - 1)
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          grays16.get(i - 1)!
        : grays16.has(i)
          ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            grays16.get(i)!
          : grays16.has(i + 1)
            ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              grays16.get(i + 1)!
            : NaN);
    if (grays16.has(i)) {
      // console.log(grayLr, '* diff:', diff.toFixed(5), i);
      errors.push(diff);
    } else if (!Number.isNaN(diff)) {
      // console.log(grayLr, '  diff:', diff.toFixed(5));
    } else {
      // console.log(grayLr);
    }
  }
  test('Conversion Errors for 16 OKLr grays in sRGB', () => {
    expect(Math.abs(errors.reduce((a, c) => a + c, 0))).toBeLessThan(0.0021);
    expect(Math.max(...errors.map(Math.abs))).toBeLessThan(0.0018);
  });
});
