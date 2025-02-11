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

//prettier-ignore
/**
 * Tag System in based mostly on Estevez-Rams et al. (mentioned above), with a correction from
 * THE COMPLETE SET OF HOMOGENEOUS HILBERT CURVES IN TWO DIMENSIONS by C. Pérez-Demydenko et al.
 * for Q0 of ₁₁H (is δm, not δa). And this implementation's tests show that Q3 of ₆H should be
 * δm (not δa nor δf as stated in the papers).
 */
const tagSystem: TagSystem = {
  //            === Quad 0 ===      === Quad 1 ===      === Quad 2 ===      === Quad 3 ===
  0:  (prev) => [  δ(δo, prev()),  u,         prev(),   r,         prev(),   d,   δ(δa, prev()) ],
  1:  (prev) => [  δ(δg, prev()),  u,   δ(δg, prev()),  r,   δ(δx, prev()),  d,   δ(δx, prev()) ],
  2:  (prev) => [  δ(δf, prev()),  u,         prev(),   r,         prev(),   d,   δ(δf, prev()) ],
  3:  (prev) => [  δ(δm, prev()),  u,   δ(δg, prev()),  r,   δ(δx, prev()),  d,   δ(δm, prev()) ],
  4:  (prev) => [  δ(δo, prev()),  u,         prev(),   r,         prev(),   d,   δ(δf, prev()) ],
  5:  (prev) => [  δ(δm, prev()),  u,   δ(δg, prev()),  r,   δ(δx, prev()),  d,   δ(δx, prev()) ],
  6:  (prev) => [  δ(δf, prev()),  u, R(δ(δy, prev())), r,         prev(),   d, R(δ(δm, prev()))],
  7:  (prev) => [  δ(δf, prev()),  u, R(δ(δy, prev())), r,         prev(),   d,   δ(δa, prev()) ],
  8:  (prev) => [R(δ(δx, prev())), u, R(δ(δy, prev())), r,         prev(),   d,   δ(δa, prev()) ],
  9:  (prev) => [R(δ(δa, prev())), u,   δ(δg, prev()),  r, R(δ(δo, prev())), d,   δ(δx, prev()) ],
  10: (prev) => [  δ(δm, prev()),  u,   δ(δg, prev()),  r, R(δ(δo, prev())), d, R(δ(δf, prev()))],
  11: (prev) => [  δ(δm, prev()),  u,   δ(δg, prev()),  r, R(δ(δo, prev())), d,   δ(δx, prev()) ],
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
