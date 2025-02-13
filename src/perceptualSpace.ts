import {
  to as convert,
  ColorSpace,
  sRGB,
  OKLrab,
  type PlainColorObject,
} from 'colorjs.io/fn';

/**
 * Registers sRGB and OKLrAB ColorSpaces, if not already registered.
 * Needed to correctly Transfrom to and from sRGB and OKLrAB.
 */
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

type Coord = number | null;
type Coords = [Coord, Coord, Coord];

/**
 * @param coords RGB coords (each 0.0 – 1.0)
 * @returns RGB color as OKLrAB Color Object
 */
export function inPerceptual(r: Coord, g: Coord, b: Coord): PlainColorObject {
  return convert({ space: sRGB, coords: [r, g, b] }, OKLrab);
}

/**
 * Take Perceptual color, make it gray and converts to 8-bit sRGB Gray
 *
 * @param perceptColorObj shortcuts with and in-place edits this color object
 * @returns perceptual 8-bit sRGB grayscale
 */
export function sRGBgrayscale(
  perceptColorObj: PlainColorObject,
  g: null,
  b: null,
): Position;
/**
 * Roundtrip from unit-scaled sRGB to Perceptual Gray back to 8-bit sRGB Gray
 *
 * @param r R coord (0.0 – 1.0)
 * @param g G coord (0.0 – 1.0)
 * @param b B coord (0.0 – 1.0)
 * @returns perceptual 8-bit sRGB grayscale
 */
export function sRGBgrayscale(r: Coord, g: Coord, b: Coord): Position;
export function sRGBgrayscale(
  r: Coord | PlainColorObject,
  g: Coord,
  b: Coord,
): Position {
  const inPercept =
    r === null || typeof r === 'number' ? inPerceptual(r, g, b) : r;
  inPercept.coords[1] = 0;
  inPercept.coords[2] = 0;
  const result = convert(inPercept, sRGB, {
    inGamut: { space: sRGB, method: 'clip' },
  }).coords;
  return scale8Bit(result);
}

export function toSRGB(perceptCoords: PlainColorObject['coords']): Position {
  const result = convert({ space: OKLrab, coords: perceptCoords }, sRGB, {
    inGamut: { space: sRGB, method: 'clip' },
  }).coords;
  return scale8Bit(result);
}

/** In-place mutates coords */
function scale8Bit(coords: Coords): Position {
  coords[0] = eightBitRound(coords[0]);
  coords[1] = eightBitRound(coords[1]);
  coords[2] = eightBitRound(coords[2]);
  return coords as Position;
}
function eightBitRound(num: number | null | undefined): number {
  return Math.round((num ?? NaN) * 255);
}
export function eightBitGray(grayscaleCoords: Coords) {
  return eightBitRound(grayscaleCoords[0] ?? NaN);
}

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
- Grayscale conversion within a Worker goes quickly enough.
- Implementations have been changed to reduce object allocations (more in-place mutations)

- deltaEOKLr2 is the new distance comparison
- deltaE is only needed for color palette decision (only need 16 comparisons)
- 1-bit dither only needs to reference the middle value of lightness axis (119 / #777)

*/
