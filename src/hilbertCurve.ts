// Hilbert Curve (L-system)
// Vₐ → λ, Δ
// Vₜ → ▶,⮠ ,⮡
// ω → λ
// λ → ⮠Δ▶⮡λ▶λ⮡▶Δ⮠
// Δ → ⮡λ▶⮠Δ▶Δ⮠▶λ⮡
// ▶ : Go
// ⮠ : 90° Left Turn
// ⮡ : 90° Right Turn

/** First Production Rule (& initiator) */
const λ = {
  *[Symbol.iterator]() {
    yield* '⮠Δ▶⮡λ▶λ⮡▶Δ⮠' as const;
  },
} as const;

/** Second Production Rule */
const Δ = {
  *[Symbol.iterator]() {
    yield* '⮡λ▶⮠Δ▶Δ⮠▶λ⮡' as const;
  },
} as const;

/** Utility for generator that yields the argument */
function yieldSelf<T>(v: T) {
  return {
    *[Symbol.iterator]() {
      yield v;
    },
  } as const;
}

type Variable = 'λ' | 'Δ';
type Terminal = '▶' | '⮠' | '⮡';
type Vocabulary = Variable | Terminal;

/** Rewrite rules for Hilbert Curve */
const rewrite: Record<
  Vocabulary,
  {
    readonly [Symbol.iterator]: () => Generator<string, void>;
  }
> = {
  λ: λ,
  Δ: Δ,
  '▶': yieldSelf('▶' as const),
  '⮠': yieldSelf('⮠' as const),
  '⮡': yieldSelf('⮡' as const),
} as const;

/** Generates the Hilbert Curve for the given order */
export function* hilbertCurve(order = 1): Generator<string, void> {
  if (order < 0) return;
  if (order === 0) {
    yield 'λ';
    return;
  }
  for (const v of hilbertCurve(order - 1)) {
    yield* rewrite[v as Vocabulary];
  }
}

/** Generates valid positions in the given 2D space that follows a Hilbert Curve */
export function* hilbertPositions(width: number, height: number) {
  if (
    width <= 0 ||
    height <= 0 ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height)
  ) {
    return;
  }
  const order = Math.ceil(Math.log2(Math.max(width, height)));

  let heading = 0,
    x = 0,
    y = 0;

  /** Actions (mutations) taken upon reaching a terminal symbol */
  const action: Record<Terminal, () => void> = {
    '▶': () => {
      x += Math.cos(heading * (Math.PI / 2));
      y += Math.sin(heading * (Math.PI / 2));
    },
    '⮠': () => (heading += 1),
    '⮡': () => (heading -= 1),
  } as const;

  yield [x, y] as [number, number];
  for (const v of hilbertCurve(order)) {
    if (Object.hasOwn(action, v)) {
      action[v as Terminal]();
      if (v === '▶') {
        const rX = Math.round(x),
          rY = Math.round(y);
        if (rX >= 0 && rX < width && rY >= 0 && rY < height) {
          yield [Math.abs(rX), Math.abs(rY)] as [number, number];
        }
      }
    }
  }
}
