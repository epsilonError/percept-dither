type Point = [number, number];

/**
 * @param vec 2-array
 * @param matrix 2×2 row-ordered matrix as flattened 4-array
 * @param inPlace pass the same Point array as vec to change in-place
 * @returns matrix pre-multiplication
 */
export function mMultiply(
  vec: Point,
  matrix: [number, number, number, number],
  inPlace: Point = [0, 0],
) {
  const x = vec[0] * matrix[0] + vec[1] * matrix[2];
  const y = vec[0] * matrix[1] + vec[1] * matrix[3];

  inPlace[0] = x;
  inPlace[1] = y;

  return inPlace;
}

/**
 * @param point 2-array
 * @param vec 2-array to translate by
 * @param times number of translations
 * @param inPlace pass the same point array to change in-place
 * @returns vector translation
 */
export function translate(
  point: Point,
  vec: Point,
  times = 1,
  inPlace: Point = [0, 0],
): Point {
  const x = point[0] + vec[0] * times;
  const y = point[1] + vec[1] * times;

  inPlace[0] = x;
  inPlace[1] = y;

  return inPlace;
}

export function* iota(n: number) {
  for (let i = 0; i < n; i++) {
    yield i;
  }
}
