import { SARGENT_LIBRARY_IN_VENICE } from './images.ts';
import type {
  Sites,
  WeightedMessage,
  WeightedResult,
} from './weightedVoronoiWorker.ts';

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

const numSites = 2048 * 5;
const numSamples = numSites * 5;

let densities: Float64Array;
let samples: Float64Array;
// let cStar: number;

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
const samplingWorker = new Worker(
  new URL('./rejectionSamplingWorker.ts', import.meta.url),
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
    ev: MessageEvent<Sites>,
    context: CanvasRenderingContext2D,
  ) {
    const { sites } = ev.data;
    context.reset();
    context.fillStyle = '#fff';
    context.fillRect(0, 0, imgWidth, imgHeight);
    context.beginPath();
    for (let i = 0; i < sites.length; i += 2) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const x = sites[i]!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        y = sites[i + 1]!;
      context.moveTo(x + 1.5, y);
      context.arc(x, y, 1.5, 0, 2 * Math.PI);
    }
    context.fillStyle = '#000';
    context.fill();
  }

  capConWorker.onmessage = (ev: MessageEvent<Sites>) => {
    drawDots(ev, capConContext);
  };
  greyWorker.onmessage = (ev: MessageEvent<Float64Array>) => {
    const points = ev.data;
    // Invert Lightness Scale to move points to dark areas
    for (let i = 0; i < points.length; ++i) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      points[i] = Math.max(0, 1 - points[i]!);
    }
    densities = points;

    /** Sample from Points */
    samplingWorker.onmessage = (ev: MessageEvent<Float64Array>) => {
      samples = ev.data;
      const partialSamples = new Float64Array(numSites * 2);

      console.log('Subsample sample space for Weighted Sites');
      for (let i = 0; i < numSites; ++i) {
        const site = Math.floor(Math.random() * numSamples);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        partialSamples[i * 2] = samples[site * 2]!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        partialSamples[1 + i * 2] = samples[1 + site * 2]!;
      }

      weightedWorker.onmessage = (ev: MessageEvent<WeightedResult>) => {
        drawDots(ev, weightContext);
        if (ev.data.cStar) {
          // cStar = ev.data.cStar;
          capConWorker.postMessage({
            densities,
            sites: ev.data.sites,
            samples,
            width,
            height,
          });
        }
      };
      weightedWorker.postMessage({
        densities,
        width,
        height,
        sites: partialSamples,
      } as WeightedMessage);
    };
    samplingWorker.postMessage({ densities, numSamples, width, height });
  };
  greyWorker.postMessage({ img: data, width, height });
};
