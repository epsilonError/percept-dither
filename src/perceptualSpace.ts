import {
  to as convert,
  parse,
  ColorSpace,
  sRGB,
  OKLrab,
  type PlainColorObject,
  serialize,
} from 'colorjs.io/fn';

ColorSpace.register(sRGB);
ColorSpace.register(OKLrab);

// Parse Color
const color = parse('red');
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
function eightBitGray(grayscaleCoord: PlainColorObject['coords']) {
  return Math.round((grayscaleCoord[0] ?? NaN) * 255);
}
const eightBitGrayValue = eightBitGray(grayscale.coords);
console.log('\n===== Color Conversion =====');
console.log(
  'sRGB Coord:                ',
  color.coords,
  '\nPerceptual Space Coord:    ',
  inPercept.coords,
  '\nPerceptual Grayscale Coord:',
  grayPercept.coords,
  '\nsRGB Grayscale Coord:      ',
  grayscale.coords,
  '\n8-bit sRGB Grayscale Value:',
  eightBitGrayValue,
  '\nSerialized Hex Code:       ',
  serialize(grayscale, { format: 'hex' }),
);

type Position = [number, number, number];

/** Given 2 coords in OKLrAB, find decent distance measure */
function deltaEOKLr2([Lr1, a1, b1]: Position, [Lr2, a2, b2]: Position) {
  const ΔLr = Lr1 - Lr2;
  const Δa = a1 - a2;
  const Δb = b1 - b2;
  const scale = 2;
  return Math.sqrt(ΔLr ** 2 + (Δa * scale) ** 2 + (Δb * scale) ** 2);
}

console.log(
  'deltaEOKLr2 (color & gray):',
  deltaEOKLr2(inPercept.coords as Position, grayPercept.coords as Position),
);

console.log('\n===== OKLr middle point in sRGB =====');
/* The middle point is all you need for 1-bit dither */
const middleGray = { ...grayPercept, coords: [0.5, 0, 0] as Position };
const middleSRBGray = convert(middleGray, sRGB, { inGamut: true });
console.log(
  'Perceptual Space Coord:',
  middleGray.coords,
  '\nsRGB Coord:            ',
  middleSRBGray.coords,
  '\n8-bit sRGB Gray Value: ',
  eightBitGray(middleSRBGray.coords),
  '\nSerialized Hexcode:    ',
  serialize(middleSRBGray, { format: 'hex' }),
);

/*
- Can we compile out the from and to matrices into linear matrices?
- Then use the built/compiled value at runtime to 1 step to OkLrab and back
    Obviously after linear sRGB
  - No, this isn't possible, OKLch has a non-linear cubic transform of each element
  - Also sRGB => Linear sRGB is not a linear transform.
  With that in mind it would be better to just use Color.js, but memoize if needed

- deltaEOKLr2 is the new distance comparison
- deltaE is only needed for color palette decision (only need 16 comparisons)
- 1-bit dither only needs to reference the middle value of lightness axis

*/
