import { SARGENT_LIBRARY_IN_VENICE } from './images.ts';

const canvasWeighted = document.getElementById(
  'canvasWeighted',
) as HTMLCanvasElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const weightContext = canvasWeighted.getContext('2d')!;
const canvasCapCon = document.getElementById(
  'canvasCapacityConstrained',
) as HTMLCanvasElement;
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const capConContext = canvasCapCon.getContext('2d')!;
const imgWidth = 476;
const imgHeight = 600;
const img = new Image(imgWidth, imgHeight);
img.src = SARGENT_LIBRARY_IN_VENICE;

const numSites = 2048;
const numSamples = numSites * 25;

const greyWorker = new Worker(
  new URL('./perceptGrayDataWorker.ts', import.meta.url),
  {
    type: 'module',
  },
);
const weightedWorker = new Worker(
  new URL('./weightedVoronoiWorker.ts', import.meta.url),
  {
    type: 'module',
  },
);
const capConWorker = new Worker(
  new URL('./capConVoronoiWorker.ts', import.meta.url),
  {
    type: 'module',
  },
);

img.onload = () => {
  weightContext.drawImage(img, 0, 0);
  const { data, width, height } = weightContext.getImageData(
    0,
    0,
    imgWidth,
    imgHeight,
  );

  function drawDots(
    ev: MessageEvent<Float64Array>,
    context: CanvasRenderingContext2D,
  ) {
    const { data: points } = ev;
    context.reset();
    context.fillStyle = '#fff';
    context.fillRect(0, 0, imgWidth, imgHeight);
    context.beginPath();
    for (let i = 0; i < points.length; i += 2) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const x = points[i]!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        y = points[i + 1]!;
      context.moveTo(x + 1.5, y);
      context.arc(x, y, 1.5, 0, 2 * Math.PI);
    }
    context.fillStyle = '#000';
    context.fill();
  }

  weightedWorker.onmessage = (ev: MessageEvent<Float64Array>) => {
    drawDots(ev, weightContext);
  };
  capConWorker.onmessage = (ev: MessageEvent<Float64Array>) => {
    drawDots(ev, capConContext);
  };
  greyWorker.onmessage = (ev: MessageEvent<Float64Array>) => {
    const points = ev.data;
    // Invert Lightness Scale to move points to dark areas
    for (let i = 0; i < points.length; ++i) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      points[i] = Math.max(0, 1 - points[i]!);
    }
    weightedWorker.postMessage({
      densities: points,
      width,
      height,
      num: numSites,
    });
    capConWorker.postMessage({
      densities: points,
      width,
      height,
      numSites,
      numSamples,
    });
  };
  greyWorker.postMessage({ img: data, width, height });
};
