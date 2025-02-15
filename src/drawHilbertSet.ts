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
/** Affine Transformations for Curve & Quadrant */
const p: Record<HHCurve, AffineTransforms> = {
  0:  { q0: [    U.R,  t['0']],      q3: [neg(U.R), t['4']]      } as const,
  1:  { q0: [    U.V,  t['2']],      q3: [neg(U.V), t['3']]      } as const,
  2:  { q0: [neg(U.I), t['3']],      q3: [neg(U.I), t['4']]      } as const,
  3:  { q0: [    U.H,  t['1']],      q3: [    U.H,  t['3']]      } as const,
  4:  { q0: [    U.R,  t['0']],      q3: [neg(U.I), t['4']]      } as const,
  5:  { q0: [    U.H,  t['1']],      q3: [neg(U.V), t['3']]      } as const,
  6:  { q0: [neg(U.I), t['3']],      q3: [    U.H,  t['3'], 'R'] } as const,
  7:  { q0: [neg(U.I), t['3']],      q3: [neg(U.R), t['4']]      } as const,
  8:  { q0: [neg(U.V), t['1'], 'R'], q3: [neg(U.R), t['4']]      } as const,
  9:  { q0: [neg(U.R), t['3'], 'R'], q3: [neg(U.V), t['3']]      } as const,
  10: { q0: [    U.H,  t['1']],      q3: [neg(U.I), t['4'], 'R'] } as const,
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

export function absScale(point: Point, order: number, quad: Quadrant): Point {
  const length = 2 ** order;
  const quadLength = order < 1 ? 0 : length / 2;

  const newPoint = sVec(quadLength > 2 ? 2 : quadLength, point);
  if (order > 2) {
    sVec(quadLength, newPoint, newPoint);
  }

  if (quad === 'q0') {
    // Keep q0 in q0:
    // 0 ≤ x ≤ quadLength - 1
    // 0 ≤ y ≤ quadLength - 1
    if (newPoint[0] !== 0 && newPoint[0] % quadLength === 0) newPoint[0] += -1;
    if (newPoint[1] !== 0 && newPoint[1] % quadLength === 0) newPoint[1] += -1;
  }
  if (quad === 'q3') {
    // keep q3 in q3:
    // quadLength ≤ x ≤ 2 * quadLength - 1
    // 0 ≤ y ≤ quadLength - 1
    if (newPoint[1] !== 0 && newPoint[1] % quadLength === 0) newPoint[1] += -1;
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
  const entryPointQ0: Point = [0, 0],
    exitPointQ0: Point = [0, 0],
    entryPointQ3: Point = [0, 0],
    exitPointQ3: Point = [0, 0];

  const stepsIter = transformSteps(curve, order);
  if (stepsIter.next().done === false) {
    // First step sets exit points
    replace(exitPointQ0, [1, 0]);
    replace(exitPointQ3, [1, 0]);
    // Perform subsequent transformations
    for (const stepCurve of stepsIter) {
      if (stepCurve > 5) {
        // Perform Reversions, if needed
        if (p[stepCurve].q0['2'] === 'R') {
          replace(entryPointQ0, exitPointQ0);
        }
        if (p[stepCurve].q3['2'] === 'R') {
          replace(entryPointQ3, exitPointQ3);
        }
      }
      affine(entryPointQ0, p[stepCurve].q0, entryPointQ0);
      affine(exitPointQ3, p[stepCurve].q3, exitPointQ3);
    }
  }
  return { entry: entryPointQ0, exit: exitPointQ3 } as const;
}

export function genSVGPath(
  curve: HHCurve,
  order: number,
  gen?: (order: number) => GenAlphabet,
) {
  // TODO: Find Boundary Vectors
  const hCurve = gen ?? HH(curve);
  const { entry: entryPoint, exit: exitPoint } = genEntryAndExit(curve, order);

  if ((curve === 6 || curve === 8 || curve === 9) && order > 2) {
    console.log(`==== ${curve.toString(10)} H ${order.toString(10)} ====`);
    console.log(
      'Q0 Entry:',
      entryPoint,
      'Guess:',
      absScale(entryPoint, order, 'q0'),
    );
    console.log(
      'Q3 Exit:',
      exitPoint,
      'Guess:',
      absScale(exitPoint, order, 'q3'),
    );
  }
  return (
    `M ${absScale(entryPoint, order, 'q0')[0].toString(10)} ${absScale(entryPoint, order, 'q0')[1].toString(10)} ` +
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
  if (i === 8 || i === 9) console.log(genSVGPath(i as HHCurve, 4));
}
