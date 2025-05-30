import { gilbertPositions } from './gilbertCurve.ts';
import { hilbertPositions } from './hilbertCurve.ts';

// =====
// SETUP
// =====

// ________________________________
// Canvas Reference and image stats
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const context = canvas.getContext('2d')!;
const canvasWidth = 512;
const canvasHeight = 342;
const pixels = canvasWidth * canvasHeight;

// _________________
// Curve to Traverse
/*const pos =*/ hilbertPositions(canvasWidth, canvasHeight);
const pos = gilbertPositions(canvasWidth, canvasHeight);

// ___________________________________________________________
// 256 Achromactic Pixels to draw on images (cached reference)
const grays = new Array<ImageBitmap>(256);
// Generate 256 individual Bitmap grays
const grayBitmaps = {
  async *[Symbol.asyncIterator]() {
    for (let i = 0; i < 256; i++) {
      yield await createImageBitmap(
        new ImageData(new Uint8ClampedArray([i, i, i, 255]), 1),
      );
    }
  },
};

/** Default colors used by Decker */
const DECKER_DEFAULT_COLORS = [
  0xffffffff, 0xffffff00, 0xffff6500, 0xffdc0000, 0xffff0097, 0xff360097,
  0xff0000ca, 0xff0097ff, 0xff00a800, 0xff006500, 0xff653600, 0xff976536,
  0xffb9b9b9, 0xff868686, 0xff454545, 0xff000000,
] as const;
/** 16 perceptually evenly spaced sRGB Grayscales */
const GRAYSCALE_16_COLORS = [
  0xffffffff, 0xffececec, 0xffd9d9d9, 0xffc7c7c7, 0xffb4b4b4, 0xffa2a2a2,
  0xff919191, 0xff7f7f7f, 0xff6e6e6e, 0xff5e5e5e, 0xff4e4e4e, 0xff3e3e3e,
  0xff2e2e2e, 0xff1e1e1e, 0xff0d0d0d, 0xff000000,
] as const;
/** Convert Hex values to equivalent RGB values (drops alpha channel) */
function convertToRGB(n: number) {
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as [
    number,
    number,
    number,
  ];
}
/** Iterable Default Decker Palette */
const defaultPalette = {
  *[Symbol.iterator]() {
    for (const c of DECKER_DEFAULT_COLORS) {
      yield convertToRGB(c);
    }
  },
};
/** Iterable 16 Grays Palette */
const sixteenGraysPalette = {
  *[Symbol.iterator]() {
    for (const c of GRAYSCALE_16_COLORS) {
      yield convertToRGB(c);
    }
  },
};

// _____________________________________________________________
// 16 Color Pixels to draw on images (based on selected palette)
const palette = new Array<ImageBitmap>(16);
const paletteBitmaps = {
  async *[Symbol.asyncIterator](
    palette: Iterable<[number, number, number]> = defaultPalette,
  ) {
    for (const rgb of palette) {
      yield await createImageBitmap(
        new ImageData(new Uint8ClampedArray([...rgb, 255]), 1),
      );
    }
  },
};

// ==========
// Initialize
// ==========

/**
 * Options for drawn colors
 *
 * - Flags for using only Black & White, 16 Grayscale Palette, or 16 Color Palette
 * - Also a Step variable to manage animation speed
 */
interface Options {
  readonly blackAndWhite: boolean;
  readonly grayscale: boolean;
  readonly color: boolean;
  readonly steps: number;
}
/** Initializes Reference Palettes and Animation options*/
async function main(
  blackAndWhite = true,
  grayscale = true,
  colors = false,
  steps = 30,
  grayColors = false,
) {
  let i = 0;
  if (blackAndWhite || grayscale) {
    console.log('Gen Grayscale Palette!');
    for await (const g of grayBitmaps) {
      grays[i] = g;
      i++;
    }
  }

  i = 0;
  if (colors) {
    console.log('Gen Color Palette');
    for await (const c of paletteBitmaps[Symbol.asyncIterator](
      grayColors ? sixteenGraysPalette : defaultPalette,
    )) {
      palette[i] = c;
      i++;
    }
  }

  return { blackAndWhite, grayscale, color: colors, steps } as const;
}

// =======
// Animate
// =======

/** Place along the curve (prototype variable) */
let place = 0;
/** Reference to needed to cancel animation frame request */
let animationID: number;
/** Starting point of animation in AnimationTimeline */
let zero: number;

main()
  .then((result) => {
    if (!result.blackAndWhite && !result.color) {
      console.log('No palettes, no positions');
      return;
    }
    if (result.steps) {
      // Schedules animation frames and number of pixels to draw per frame
      const multiDraw = (repeat: number) => {
        let count = 0;
        let p = pos.next();
        if (p.done) {
          return p;
        }
        while (count < repeat) {
          if (count !== 0) {
            p = pos.next();
          }
          if (p.value && !p.done) {
            drawOnCanvas(...p.value, result);
          }
          count++;
        }
        return p;
      };
      const animate = (t: number) => {
        if (!zero) {
          zero = t;
        }
        const attempt = pixels / (60 * result.steps);
        const p = multiDraw(
          attempt < 1 ? 1 : attempt > pixels ? pixels : Math.trunc(attempt),
        );
        animationID = requestAnimationFrame(animate);
        if (p.done) {
          cancelAnimationFrame(animationID);
        }
      };
      animate(+(document.timeline.currentTime ?? 0));
    } else {
      // Just draw over the canvas
      for (const p of pos) {
        drawOnCanvas(...p, result);
      }
    }
  })
  .catch((e: unknown) => {
    console.error(e);
  });

/**
 * Draws a single pixel on the Canvas
 * @param x x-position on the canvas
 * @param y y-position on the canvas
 * @param options Flags defining what palette should be used
 * @returns
 */
function drawOnCanvas(x: number, y: number, options: Options) {
  if (!options.blackAndWhite && !options.grayscale && !options.color) {
    console.log('No palette to work from!');
    return;
  }
  /**
   * Index of the reference palette to use
   *
   * Currently selects based on place along the curve.
   *
   * @todo implement alternative selection criteria
   */
  const select = options.color
    ? Math.round(((16 - 1) / pixels) * place)
    : options.grayscale
      ? Math.round(((256 - 1) / pixels) * place)
      : (place % 2) * (256 - 1);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const bitmap = options.color ? palette[select]! : grays[select]!;
  context.drawImage(bitmap, x, y); // Uses ImageBitmap
  place = place + 1; // used to prototype
}
