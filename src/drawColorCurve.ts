import { positions } from './spaceCurve.js';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const context = canvas.getContext('2d')!;
const canvasWidth = 512;
const canvasHeight = 342;
const pixels = canvasWidth * canvasHeight;

const pos = positions(canvasWidth, canvasHeight);

// Generate an array of 256 individual Bitmap grays
const grays = new Array<ImageBitmap>(256);
const grayBitmaps = {
  async *[Symbol.asyncIterator]() {
    for (let i = 0; i < 256; i++) {
      yield await createImageBitmap(
        new ImageData(new Uint8ClampedArray([i, i, i, 255]), 1),
      );
    }
  },
};

const DECKER_DEFAULT_COLORS = [
  0xffffffff, 0xffffff00, 0xffff6500, 0xffdc0000, 0xffff0097, 0xff360097,
  0xff0000ca, 0xff0097ff, 0xff00a800, 0xff006500, 0xff653600, 0xff976536,
  0xffb9b9b9, 0xff868686, 0xff454545, 0xff000000,
] as const;
function convertToRGB(n: number) {
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff] as [
    number,
    number,
    number,
  ];
}
const defaultPalette = {
  *[Symbol.iterator]() {
    for (const c of DECKER_DEFAULT_COLORS) {
      yield convertToRGB(c);
    }
  },
};
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

interface Options {
  readonly blackAndWhite: boolean;
  readonly color: boolean;
  readonly steps: number;
}
async function main(blackAndWhite = true, colors = false, steps = 30) {
  let i = 0;
  if (blackAndWhite) {
    console.log('Gen Grayscale Palette!');
    for await (const g of grayBitmaps) {
      grays[i] = g;
      i++;
    }
  }

  i = 0;
  if (colors) {
    console.log('Gen Color Palette');
    for await (const c of paletteBitmaps) {
      palette[i] = c;
      i++;
    }
  }

  return { blackAndWhite: blackAndWhite, color: colors, steps } as const;
}

let place = 0;
let animationID: number;
let zero: number;

main()
  .then((result) => {
    if (!result.blackAndWhite && !result.color) {
      console.log('No palettes, no positions');
      return;
    }
    if (result.steps) {
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
            redrawCanvas(...p.value, result);
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
      for (const p of pos) {
        redrawCanvas(...p, result);
      }
    }
  })
  .catch((e: unknown) => {
    console.error(e);
  });

function redrawCanvas(x: number, y: number, options: Options) {
  if (!options.blackAndWhite && !options.color) {
    console.log('No palette to work from!');
    return;
  }
  const select = options.color
    ? Math.round(((16 - 1) / pixels) * place)
    : Math.round(((256 - 1) / pixels) * place);

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const bitmap = options.color ? palette[select]! : grays[select]!;
  context.drawImage(bitmap, x, y); // Uses ImageBitmap
  place = place + 1;
}
