import {
  to as convert,
  ColorSpace,
  sRGB,
  OKLrab,
  type PlainColorObject,
} from 'colorjs.io/fn';

export function registerColorSpaces() {
  const registered = new Set<string>(Object.keys(ColorSpace.registry));
  if (!registered.has('srgb')) {
    ColorSpace.register(sRGB);
  }
  if (!registered.has('oklrab')) {
    ColorSpace.register(OKLrab);
  }
}

/**
 * @param coords RGB coords (each 0.0 – 1.0)
 * @returns equivalent okLr Position (i.e. perceptual grayscale)
 */
export function okLrPos(coords: Position): number {
  return convert({ space: sRGB, coords }, OKLrab).coords[0] ?? NaN;
}

/**
 * @param coords RGB coords (each 0.0 – 1.0)
 * @returns perceptual 8-bit sRGB grayscale value
 */
export function sRGBgrayscale(coords: Position): number {
  const inPercept = convert({ space: sRGB, coords }, OKLrab);
  inPercept.coords[1] = 0;
  inPercept.coords[2] = 0;
  return eightBitGray(
    convert(inPercept, sRGB, { inGamut: { space: sRGB, method: 'clip' } })
      .coords,
  );
}

export function eightBitGray(grayscaleCoord: PlainColorObject['coords']) {
  return Math.round((grayscaleCoord[0] ?? NaN) * 255);
}

registerColorSpaces();

export type Position = [number, number, number];

/** Given 2 coords in OKLrAB, find decent distance measure */
export function deltaEOKLr2([Lr1, a1, b1]: Position, [Lr2, a2, b2]: Position) {
  const ΔLr = Lr1 - Lr2;
  const Δa = a1 - a2;
  const Δb = b1 - b2;
  const scale = 2;
  return Math.sqrt(ΔLr ** 2 + (Δa * scale) ** 2 + (Δb * scale) ** 2);
}

/*
- Can we compile out the from and to matrices into linear matrices?
- Then use the built/compiled value at runtime to 1 step to OkLrab and back
    Obviously after linear sRGB
  - No, this isn't possible, OKLch has a non-linear cubic transform of each element
  - Also sRGB => Linear sRGB is not a linear transform.
  With that in mind it would be better to just use Color.js, but memoize if needed

- deltaEOKLr2 is the new distance comparison
- deltaE is only needed for color palette decision (only need 16 comparisons)
- 1-bit dither only needs to reference the middle value of lightness axis (119 / #777)

*/
