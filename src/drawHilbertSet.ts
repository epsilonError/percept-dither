import {
  HH,
  type Alphabet,
  type GenAlphabet,
  type HHCurve,
} from './hilbertSet.ts';
import {
  iota,
  mMultiply,
  replace,
  sMatrix,
  sVec,
  translate,
  type Matrix,
  type Point,
} from './mathUtils.ts';

// ----- SVG Draw Hilbert Sets -----
// Based on Arithmetic Representation of Homogenous Hilbert Curves
// from HILBERT CURVES IN TWO DIMENSIONS by Estevez-Rams et al.
//
// Currently only useful for drawing SVG paths and extracting the
// boundary vectors.

type MatrixTransform = 'I' | 'R' | 'V' | 'H';
type VecTransform = 0 | 1 | 2 | 3 | 4 | 5;
type Affine = [Matrix, Point] | [Matrix, Point, 'R'];
type Quadrant = 'q0' | 'q3';
type AffineTransforms = Record<Quadrant, Affine>;

/** Affine Transform U Matrices */
const U: Record<MatrixTransform, Matrix> = {
  I: sMatrix(0.5, [1, 0, 0, 1]),
  R: sMatrix(0.5, [0, 1, 1, 0]),
  V: sMatrix(0.5, [0, -1, 1, 0]),
  H: sMatrix(0.5, [1, 0, 0, -1]),
};
/** Affine Transform t Vectors */
const t: Record<VecTransform, Point> = {
  0: sVec(0.5, [0, 0]),
  1: sVec(0.5, [0, 1]),
  2: sVec(0.5, [1, 0]),
  3: sVec(0.5, [1, 1]),
  4: sVec(0.5, [2, 1]),
  5: sVec(0.5, [1, 2]),
};

/** Returns -1 * Matrix */
function neg(m: Matrix) {
  return sMatrix(-1, m);
}

//prettier-ignore
/** Affine Transformations for Curve & Quadrant
 *
 * Includes corrections to paper based on this implementation's tests.
 * - Quad 3 of ₆H is [Uᵥ,t₃]
 * - Quad 1 of ₈H is [Uₕ,t₁]
 * - Quad 1 of ₉H is [Uᵢ,t₃]
 * - Quad 3 of ₁₀H is [-Uᵣ,t₄]
 *
 * These corrections are enough for my uses. Equivalent and more exact
 * Affine Transformations may be needed in future.
 */
const p: Record<HHCurve, AffineTransforms> = {
  0:  { q0: [    U.R,  t['0']],      q3: [neg(U.R), t['4']]      } as const,
  1:  { q0: [    U.V,  t['2']],      q3: [neg(U.V), t['3']]      } as const,
  2:  { q0: [neg(U.I), t['3']],      q3: [neg(U.I), t['4']]      } as const,
  3:  { q0: [    U.H,  t['1']],      q3: [    U.H,  t['3']]      } as const,
  4:  { q0: [    U.R,  t['0']],      q3: [neg(U.I), t['4']]      } as const,
  5:  { q0: [    U.H,  t['1']],      q3: [neg(U.V), t['3']]      } as const,
  6:  { q0: [neg(U.I), t['3']],      q3: [neg(U.V), t['3']]      } as const,
  7:  { q0: [neg(U.I), t['3']],      q3: [neg(U.R), t['4']]      } as const,
  8:  { q0: [    U.H,  t['1']],      q3: [neg(U.R), t['4']]      } as const,
  9:  { q0: [neg(U.I), t['3']],      q3: [neg(U.V), t['3']]      } as const,
  10: { q0: [    U.H,  t['1']],      q3: [neg(U.R), t['4']]      } as const,
  11: { q0: [    U.H,  t['1']],      q3: [neg(U.V), t['3']]      } as const,
};

/** Apply the Affine Transformation */
function affine(pos: Point, [m, t]: Affine, inPlace: Point = [0, 0]) {
  return translate(mMultiply(m, pos, inPlace), t, 1, inPlace);
}

/**
 * Handles Curve and Order constraints
 *
 * Curves can be constrained by their order and a previous Curve they could be a transformation of.
 * */
function constrainCurve(curve: HHCurve, order: number) {
  return order < 2 ? 0 : curve > 5 && order < 3 ? 5 : curve;
}
/** Steps transformed through to get to a Curve of specified Order (order constrains final curve)*/
function* transformSteps(
  curve: HHCurve,
  order: number,
): Generator<HHCurve, void> {
  const zeroHs = order - 2 > 0 ? order - 2 : 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _ of iota(zeroHs)) {
    yield 0; // Orders up to n-2 are always curve 0
  }
  if (order - 1 > 0) {
    yield constrainCurve(curve < 6 ? 0 : 5, order - 1);
  }
  if (order > 0) {
    yield constrainCurve(curve, order);
  }
}

export function absScale(
  point: Point,
  order: number,
  quad: Quadrant,
  curve: HHCurve,
): Point {
  if (point.every((x) => x === 0)) {
    return point;
  }

  const length = order < 1 ? 0 : 2 ** order;
  const quadLength = length / 2;

  const newPoint = sVec(length, point);
  const [x_pos, y_pos] = newPoint;

  if (quad === 'q0') {
    if (point[0] > 0.5) {
      throw new Error(point.toString());
    }
    if (point[1] > 0.5) {
      throw new Error(point.toString());
    }
    // Keep q0 in q0:
    // 0 ≤ x ≤ quadLength - 1
    // 0 ≤ y ≤ quadLength - 1
    if (x_pos !== 0) newPoint[0] += -1;
    if (y_pos !== 0) newPoint[1] += -1;
    if (order > 2 && [6, 7, 10, 11].includes(curve)) newPoint[1] += 1;
  }
  if (quad === 'q3') {
    if (point[0] < 0.5) {
      throw new Error(point.toString());
    }
    if (point[1] > 0.5) {
      throw new Error(point.toString());
    }
    // keep q3 in q3:
    // quadLength ≤ x ≤ length - 1
    // 0 ≤ y ≤ quadLength - 1
    if (x_pos > quadLength) newPoint[0] += -1;
    if (y_pos !== 0) newPoint[1] += -1;
  }
  return newPoint;
}

export interface BoundaryVectors {
  readonly entry: Point;
  readonly exit: Point;
}
export function genEntryAndExit(
  curve: HHCurve,
  order: number,
): BoundaryVectors {
  const entryVecQ0: Point = [0, 0],
    exitVecQ0: Point = [0, 0],
    entryVecQ3: Point = [0, 0],
    exitVecQ3: Point = [0, 0];

  const stepsIter = transformSteps(curve, order);
  if (stepsIter.next().done === false) {
    // First step sets exit points
    replace(exitVecQ0, [1, 0]);
    replace(exitVecQ3, [1, 0]);
    // Perform subsequent transformations
    for (const stepCurve of stepsIter) {
      affine(entryVecQ0, p[stepCurve].q0, entryVecQ0);
      affine(exitVecQ0, p[stepCurve].q0, exitVecQ0);
      affine(entryVecQ3, p[stepCurve].q3, entryVecQ3);
      affine(exitVecQ3, p[stepCurve].q3, exitVecQ3);
      if (stepCurve > 5) {
        // Perform Reversions, if needed
        if (p[stepCurve].q0['2'] === 'R') {
          replace(entryVecQ0, exitVecQ0);
        }
        if (p[stepCurve].q3['2'] === 'R') {
          replace(entryVecQ3, exitVecQ3);
        }
      }
    }
  }
  return { entry: entryVecQ0, exit: exitVecQ3 } as const;
}

export function genSVGPath(
  curve: HHCurve,
  order: number,
  gen?: (order: number) => GenAlphabet,
) {
  // TODO: Find Boundary Vectors
  //       - The Entry and Exit vectors for Quadrants with Reversions aren't working out
  //         which in turn makes the discretized position calculations incorrect.
  //       - And changing those vectors to the correct position will need more figuring.
  //         Off by one errors abound in the absScale implmentation. Though I could hard
  //         code the differences as a last resort. (Did a bit of hard coding)
  //       - All errors coincide with r → rʹ transformation from Table 6 in the paper
  const hCurve = gen ?? HH(curve);
  const { entry: entryPoint /*exit: exitPoint*/ } = genEntryAndExit(
    curve,
    order,
  );

  // console.log(`==== ${curve.toString(10)} H ${order.toString(10)} ====`);
  // console.log(
  //   'Q0 Entry:',
  //   entryPoint,
  //   'Guess:',
  //   absScale(entryPoint, order, 'q0', curve),
  // );
  // console.log(
  //   'Q3 Exit:',
  //   exitPoint,
  //   'Guess:',
  //   absScale(exitPoint, order, 'q3', curve),
  // );

  return (
    `M ${absScale(entryPoint, order, 'q0', curve)[0].toString(10)} ${absScale(entryPoint, order, 'q0', curve)[1].toString(10)} ` +
    Array.from(hCurve(order), alphabet2SVG).join(' ')
  );
}
const svgMorph: Record<Alphabet, string> = {
  u: 'v 1',
  r: 'h 1',
  d: 'v -1',
  l: 'h -1',
} as const;
function alphabet2SVG(a: Alphabet): string {
  return svgMorph[a];
}

for (const i of iota(12)) {
  console.log(genSVGPath(i as HHCurve, 3));
}
