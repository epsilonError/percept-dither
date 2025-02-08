// Hilbert Tag System
// A → u, d, l ,r
// λ → urd

// Based on HILBERT CURVES IN TWO DIMENSIONS by Estevez-Rams et al.

type Alphabet = 'u' | 'd' | 'l' | 'r';
type IterAlphabet = Iterable<Alphabet>;
type GenAlphabet = Generator<Alphabet, void>;
type Mapping = (order: number) => IterAlphabet;
type Morphism = Record<
  Alphabet,
  { readonly [Symbol.iterator]: () => GenAlphabet }
>;
type HHCurve = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
type TagSystem = Record<
  HHCurve,
  (prev: () => GenAlphabet) => Parameters<typeof pipe>
>;

/** Utility for generator that yields the argument */
function yieldSelf<T>(v: T) {
  return {
    *[Symbol.iterator]() {
      yield v;
    },
  } as const;
}

const u = yieldSelf<'u'>('u');
const d = yieldSelf<'d'>('d');
const l = yieldSelf<'l'>('l');
const r = yieldSelf<'r'>('r');

const δo: Morphism = { u: r, r: u, d: l, l: d } as const;
const δa: Morphism = { u: l, r: d, d: r, l: u } as const;
const δg: Morphism = { u: l, r: u, d: r, l: d } as const;
const δx: Morphism = { u: r, r: d, d: l, l: u } as const;
const δf: Morphism = { u: d, r: l, d: u, l: r } as const;
const δm: Morphism = { u: d, r: r, d: u, l: l } as const;
const δy: Morphism = { u: u, r: l, d: d, l: r } as const;
const swap: Morphism = { u: d, r: l, d: u, l: r } as const;

const tagSystem: TagSystem = {
  0: (pre) => [δ(δo, pre()), u, pre(), r, pre(), d, δ(δa, pre())],
  1: (pre) => [δ(δg, pre()), u, δ(δg, pre()), r, δ(δx, pre()), d, δ(δx, pre())],
  2: (pre) => [δ(δf, pre()), u, pre(), r, pre(), d, δ(δf, pre())],
  3: (pre) => [δ(δm, pre()), u, δ(δg, pre()), r, δ(δx, pre()), d, δ(δm, pre())],
  4: (pre) => [δ(δo, pre()), u, pre(), r, pre(), d, δ(δf, pre())],
  5: (pre) => [δ(δm, pre()), u, δ(δg, pre()), r, δ(δx, pre()), d, δ(δx, pre())],
  6: (pre) => [δ(δf, pre()), u, R(δ(δy, pre())), r, pre(), d, R(δ(δa, pre()))],
  7: (pre) => [δ(δf, pre()), u, R(δ(δy, pre())), r, pre(), d, δ(δa, pre())],
  8: (pre) => [R(δ(δx, pre())), u, R(δ(δy, pre())), r, pre(), d, δ(δa, pre())],
  9: (p) => [R(δ(δa, p())), u, δ(δg, p()), r, R(δ(δo, p())), d, δ(δx, p())],
  10: (p) => [δ(δa, p()), u, δ(δg, p()), r, R(δ(δo, p())), d, R(δ(δx, p()))],
  11: (p) => [δ(δa, p()), u, δ(δg, p()), r, R(δ(δo, p())), d, δ(δx, p())],
} as const;

/** Reversion Operator (Reverse and Swap Direction) */
export function* R(...args: IterAlphabet[]): IterAlphabet {
  const result: Alphabet[] = [];
  for (const gen of args) {
    for (const a of gen) {
      result.push(a);
    }
  }
  result.reverse();
  for (const a of result) {
    yield* swap[a];
  }
}

/** Pipeline Generators/Iterators */
function* pipe(...args: (IterAlphabet | GenAlphabet)[]) {
  for (const arg of args) {
    yield* arg;
  }
}
/** Apply Morphism to Word */
function* δ(δ: Morphism, word: IterAlphabet) {
  for (const a of word) {
    yield* δ[a];
  }
}
/** Store a pipeline of Words as a string  */
function store(...args: Parameters<typeof pipe>): string {
  return Array.from(pipe(...args)).join('');
}
/** Hilbert Curve orders are Integers > 0 */
function isValidOrder(order: number) {
  return order >= 1 && Number.isSafeInteger(order);
}

const zeroHCache = new Map<Parameters<Mapping>['0'], string>();
/** Memoized Generator of the Original Hilbert Curve */
export function* zeroH(order: number): GenAlphabet {
  if (zeroHCache.has(order)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for (const a of zeroHCache.get(order)!) {
      yield a as Alphabet;
    }
  } else {
    if (isValidOrder(order)) {
      if (order === 1) {
        zeroHCache.set(order, 'urd');
      } else {
        const prev = () => zeroH(order - 1);
        const word = store(...tagSystem[0](prev));
        zeroHCache.set(order, word);
      }
      yield* zeroH(order);
    }
  }
}

const fiveHCache = new Map<Parameters<Mapping>['0'], string>();
/** Memoized Generator of Homogenous Hilbert Curve ₅H from Estevez-Rams et al. */
export function* fiveH(order: number): GenAlphabet {
  if (fiveHCache.has(order)) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for (const a of fiveHCache.get(order)!) {
      yield a as Alphabet;
    }
  } else {
    if (isValidOrder(order)) {
      if (order === 1) {
        fiveHCache.set(order, store(zeroH(1)));
      } else {
        const prev = () => zeroH(order - 1);
        const word = store(...tagSystem[5](prev));
        fiveHCache.set(order, word);
      }
      yield* fiveH(order);
    }
  }
}

/** Empty Generator used for Invalid Orders/Curves */
// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
function* emptyGen(_: number): GenAlphabet {}

/**
 * Creates functions for generating Homogenous Hilbert Curves (uses memoized results)
 * @param curve Curve Number (0–11)
 * @returns A function to generate any order of the specified curve
 */
export function HH(curve: HHCurve): (order: number) => GenAlphabet {
  if (curve < 0 || curve > 11) {
    return emptyGen;
  } else {
    if (curve === 0) {
      return zeroH;
    } else if (curve === 5) {
      return fiveH;
    } else if (curve < 6) {
      return (order: number) =>
        !isValidOrder(order)
          ? emptyGen(order)
          : pipe(...tagSystem[curve](() => zeroH(order - 1)));
    } else {
      return (order: number) =>
        !isValidOrder(order)
          ? emptyGen(order)
          : order < 2
            ? zeroH(order)
            : order === 2
              ? fiveH(order)
              : pipe(...tagSystem[curve](() => fiveH(order - 1)));
    }
  }
}
