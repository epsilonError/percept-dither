// Gilbert (Generalized Hilbert) Curve
// Vₐ → ⬚, ◫, ◱, ⊟, ◲
// Vₜ → ▬, ▮, ⧄, ⧅
// ω → ⬚
// ⬚ → recursive (entry, width, height) {
//    height == 1 → ▬
//    width == 1 → ▮
//    2×width > 3×height → ◫
//    2×width ≤ 3×height → ◱⊟◲ [chooses how to split the height (1st is even)]
//  }
// ◫ → ⬚⬚ (split width) [chooses how to split the width (1st is even)]
// ◱ → ⧄⬚⧄ (step up, i.e. bottom left quad)
// ⊟ → ⬚ (long step right, i.e. top 2 quads)
// ◲ → ⧅⬚⧅ (step down, i.e. bottom right quad)
// ▬ → fill row (base case, major axis)
// ▮ → fill column (base case, orthogonal axis)
// ⧄ → reflect bases across y =  x
// ⧅ → reflect bases across y = -x
// Note: - The major & orthogonal bases are manipulated to perform
//         the proper up → long right → down stepping in context
//       - 1st Entry point (ω) sets major basis (i.e. width axis) along longest side
//       - Every ⬚ needs to be provided an entry position, and bounding box
//       - When a box fills, jump to the next box and its entry position

type Position = [number, number];

/**
 * @param base 2-array
 * @param matrix 2×2 row-ordered matrix as flattened 4-array
 * @param inplace pass the same position array as base to change in-place
 * @returns matrix pre-multiplication
 */
function mult(
  base: Position,
  matrix: [number, number, number, number],
  inplace: Position = [0, 0],
) {
  const x = base[0] * matrix[0] + base[1] * matrix[2];
  const y = base[0] * matrix[1] + base[1] * matrix[3];

  inplace[0] = x;
  inplace[1] = y;

  return inplace;
}

function* iota(n: number) {
  for (let i = 0; i < n; i++) {
    yield i;
  }
}

function move(
  position: Position,
  basis: Position,
  times: number,
  inplace: Position = [0, 0],
): Position {
  const x = position[0] + basis[0] * times;
  const y = position[1] + basis[1] * times;

  inplace[0] = x;
  inplace[1] = y;

  return inplace;
}

export function* gilbertPositions(width: number, height: number) {
  if (
    width < 1 ||
    height < 1 ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height)
  ) {
    return;
  }
  const major: Position = [1, 0],
    ortho: Position = [0, 1];

  const reflect = () => {
    mult(major, [0, 1, 1, 0], major);
    mult(ortho, [0, 1, 1, 0], ortho);
  };
  const negReflect = () => {
    mult(major, [0, -1, -1, 0], major);
    mult(ortho, [0, -1, -1, 0], ortho);
  };

  function* gilbert(
    entry: Position,
    width: number,
    height: number,
  ): Generator<Position, void> {
    let hWidth = Math.trunc(width / 2);
    let hHeight = Math.trunc(height / 2);
    if (height === 1) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const _ of iota(width)) {
        yield structuredClone(entry);
        move(entry, major, 1, entry);
      }
    } else if (width === 1) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const _ of iota(height)) {
        yield structuredClone(entry);
        move(entry, ortho, 1, entry);
      }
    } else if (2 * width > 3 * height) {
      if (hWidth % 2 && width > 2) {
        hWidth += 1;
      }

      yield* gilbert(structuredClone(entry), hWidth, height);
      yield* gilbert(move(entry, major, hWidth), width - hWidth, height);
    } else if (2 * width <= 3 * height) {
      if (hHeight % 2 && height > 2) {
        hHeight += 1;
      }
      const rightEntry = move(entry, ortho, hHeight);
      const downEntry = move(move(entry, ortho, hHeight - 1), major, width - 1);

      reflect();
      yield* gilbert(structuredClone(entry), hHeight, hWidth);
      reflect();
      yield* gilbert(rightEntry, width, Math.abs(height - hHeight));
      negReflect();
      yield* gilbert(downEntry, hHeight, Math.abs(width - hWidth));
      negReflect();
    }
  }

  if (width < height) {
    reflect();
    [width, height] = [height, width];
  }

  yield* gilbert([0, 0], width, height);
}
