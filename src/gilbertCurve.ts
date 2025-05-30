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

import { mMultiply, translate as move, iota, type Point } from './mathUtils';

/** Generates valid positions in the given 2D space that follows a Gilbert Curve */
export function* gilbertPositions(width: number, height: number) {
  if (
    width < 1 ||
    height < 1 ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height)
  ) {
    return;
  }
  const major: Point = [1, 0],
    ortho: Point = [0, 1];

  /** Reflect the Major and Orthogonal bases across y = x */
  const reflect = () => {
    mMultiply([0, 1, 1, 0], major, major);
    mMultiply([0, 1, 1, 0], ortho, ortho);
  };
  /** Reflect the Major and Orthogonal bases across y = -x */
  const negReflect = () => {
    mMultiply([0, -1, -1, 0], major, major);
    mMultiply([0, -1, -1, 0], ortho, ortho);
  };

  function* gilbert(
    entry: Point,
    width: number,
    height: number,
  ): Generator<Point, void> {
    let hWidth = Math.trunc(width / 2);
    let hHeight = Math.trunc(height / 2);
    if (height === 1) {
      // yield each entry in the row
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const _ of iota(width)) {
        yield [...entry];
        move(entry, major, 1, entry);
      }
    } else if (width === 1) {
      // yield each entry in the column
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const _ of iota(height)) {
        yield [...entry];
        move(entry, ortho, 1, entry);
      }
    } else if (2 * width > 3 * height) {
      if (hWidth % 2 && width > 2) {
        hWidth += 1; // make first half width even
      }

      yield* gilbert([...entry], hWidth, height);
      yield* gilbert(move(entry, major, hWidth), width - hWidth, height);
    } else if (2 * width <= 3 * height) {
      if (hHeight % 2 && height > 2) {
        hHeight += 1; // make first half height even
      }
      const rightEntry = move(entry, ortho, hHeight);
      const downEntry = move(move(entry, ortho, hHeight - 1), major, width - 1);

      // STEP UP
      reflect();
      yield* gilbert([...entry], hHeight, hWidth);
      reflect();
      // LONG STEP RIGHT
      yield* gilbert(rightEntry, width, Math.abs(height - hHeight));
      // STEP DOWN
      negReflect();
      yield* gilbert(downEntry, hHeight, Math.abs(width - hWidth));
      negReflect();
    }
  }

  if (width < height) {
    // Set the Major axis along the longer side
    reflect();
    [width, height] = [height, width];
  }

  yield* gilbert([0, 0], width, height);
}
