/** Arbitrary 2D Point, assumed [x, y] */
export type Point = [number, number];
/** 2×2 Row-Ordered Matrix flattened into Length 4 Array */
export type Matrix = [number, number, number, number];

/**
 * @param matrix 2×2 row-ordered matrix as flattened 4-array
 * @param vec 2-array as column vector
 * @param inPlace pass the same Point array as vec to change in-place
 * @returns matrix post-multiplication
 */
export function mMultiply(
  matrix: Readonly<Matrix>,
  vec: Readonly<Point>,
  inPlace: Point = [0, 0],
) {
  const x = matrix[0] * vec[0] + matrix[1] * vec[1];
  const y = matrix[2] * vec[0] + matrix[3] * vec[1];

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
  point: Readonly<Point>,
  vec: Readonly<Point>,
  times = 1,
  inPlace: Point = [0, 0],
): Point {
  const x = point[0] + vec[0] * times;
  const y = point[1] + vec[1] * times;

  inPlace[0] = x;
  inPlace[1] = y;

  return inPlace;
}

/** Generator of numbers 0 … n-1 */
export function* iota(n: number): Generator<number> {
  for (let i = 0; i < n; ++i) {
    yield i;
  }
}

/** Replace a and b's values in place */
export function replace(a: Point, b: Point): void {
  const [x, y] = a;
  a[0] = b[0];
  a[1] = b[1];
  b[0] = x;
  b[1] = y;
}

/** Scalar and Vector Multiply, use inPlace to specify Vector to update */
export function sVec(
  scalar: number,
  vec: Readonly<Point>,
  inPlace: Point = [0, 0],
) {
  inPlace[0] = scalar * vec[0];
  inPlace[1] = scalar * vec[1];
  return inPlace;
}

/** Scalar and Matrix Multiply, use inPlace to specify Matrix to update */
export function sMatrix(
  scalar: number,
  matrix: Readonly<Matrix>,
  inPlace: Matrix = [0, 0, 0, 0],
) {
  inPlace[0] = scalar * matrix[0];
  inPlace[1] = scalar * matrix[1];
  inPlace[2] = scalar * matrix[2];
  inPlace[3] = scalar * matrix[3];
  return inPlace;
}

/** Squared Distance between two Points */
export function distanceSq(
  [x0, y0]: Readonly<Point>,
  [x1, y1]: Readonly<Point>,
) {
  return (x0 - x1) ** 2 + (y0 - y1) ** 2;
}

export function union<T>(a: Set<T>, b: Readonly<Set<T>>) {
  for (const el of b) {
    a.add(el);
  }
  return a;
}

/**
 * Iterable of non-NaN numbers within a grouping (`id`)
 * of length `offset` from a flat `source` array
 */
export function* nonNaNGroupValues(
  id: number,
  source: Readonly<Uint32Array>,
  offset: number,
): Iterable<number> {
  for (const i of iota(offset)) {
    const result = source[i + offset * id] ?? NaN;
    if (!Number.isNaN(result)) {
      yield result;
    } else {
      break;
    }
  }
}

/**
 * Calc the 2D centroid using an iterable of point ids
 * and their flat `source` array
 */
export function centroid(
  points: Iterable<number>,
  source: Readonly<Float64Array>,
): readonly [number, number] {
  let x = 0,
    y = 0,
    count = 0;

  for (const id of points) {
    const [x1, y1] = point(id, source);
    x += x1;
    y += y1;
    ++count;
  }

  x /= count ? count : 1;
  y /= count ? count : 1;
  return [x, y] as const;
}

/** Grab a point from a flat array structure */
export function point(id: number, source: Readonly<Float64Array>) {
  return [source[id * 2] ?? NaN, source[1 + id * 2] ?? NaN] as const;
}

export function sum(values: Iterable<number>) {
  let sum = 0;
  for (const v of values) {
    sum += v;
  }
  return sum;
}
