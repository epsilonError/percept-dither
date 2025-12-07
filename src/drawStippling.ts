// import {
//   smallTestSet,
//   // storedAssignments,
//   // storedDensities,
//   // storedSamples,
//   // storedSites,
// } from './capConBackup.ts';
import type { RegionAssignments } from './capConVoronoiWorker.ts';
import { SARGENT_LIBRARY_IN_VENICE } from './images.ts';
import { iota, point, sum } from './mathUtils.ts';
import type {
  Sites,
  WeightedMessage,
  WeightedResult,
} from './weightedVoronoiWorker.ts';

/** Baseline Radius that may be scaled when drawn */
const BASE_RADIUS = {
  /** Circle inscribed in a 1x1 pixel */
  INSCRIBED_DOT: 0.5 as const,
  /** Circle with Equal Area to a 1x1 pixel */
  AREA_MATCHING: Math.sqrt(1 / Math.PI),
  /** Circle that inscribes a 1x1 pixel */
  INSCRIBED_PIXEL: Math.SQRT1_2,
} as const;

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

const numSites = 64;
const numSamples = numSites * 32;

let densities: Float64Array;
let samples: Float64Array;
let sites: Float64Array;
// let regionAssignments: Uint32Array;
// let cStar: number;
let totalDensity: number;

/** Backup Supply */
// densities = storedDensities();
// totalDensity = sum(densities);
// samples = storedSamples('20527Stable');
// sites = storedSites(102800);
// regionAssignments = storedAssignments('20527Stable');
// const { densities, width, height } = smallTestSet();

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

function drawDots(
  ev: MessageEvent<Sites>,
  context: CanvasRenderingContext2D,
  totalDensity?: number,
  verbose = false,
) {
  const { sites } = ev.data;
  const numSites = sites.length / 2;

  /**
   * Scale the radius based on the total density
   *
   * - Total Density is the equivalent area of black pixels.
   * - Each site needs its own coverage of this area.
   * - And square root the coverage to go from an area to a length
   *
   * That length can be used to scale the radius.
   */
  const scaleFactor = totalDensity ? Math.sqrt(totalDensity / numSites) : 1;

  if (totalDensity && verbose) {
    console.log(
      '_________\nDensities\n Total:',
      totalDensity,
      '\n Scale Factor:',
      scaleFactor,
    );
  }

  context.reset();
  context.fillStyle = '#fff';
  context.fillRect(0, 0, imgWidth, imgHeight);
  context.beginPath();
  for (const i of iota(numSites)) {
    const [x, y] = point(i, sites);

    context.moveTo(x, y);
    context.arc(
      x + 0.5,
      y + 0.5,
      BASE_RADIUS.AREA_MATCHING * scaleFactor,
      0,
      2 * Math.PI,
    );
  }
  context.fillStyle = '#000';
  context.fill();
}

img.onload = () => {
  weightContext.drawImage(img, 0, 0);
  const { data, width, height } = weightContext.getImageData(
    0,
    0,
    imgWidth,
    imgHeight,
  );

  /**
   * Draw Dots without processing
   */
  // drawDots({ data: { sites: sites } } as MessageEvent<Sites>, weightContext);
  // drawDots(
  //   {
  //     data: {
  //       sites,
  //     },
  //   } as MessageEvent<Sites>,
  //   capConContext,
  //   totalDensity,
  // );

  /**
   * Draw starting Sites and run Capacity Constrained Voronoi with them
   */
  // capConWorker.onmessage = (ev: MessageEvent<RegionAssignments>) => {
  //   drawDots(ev, capConContext, totalDensity);
  // };
  // drawDots({ data: { sites: sites } } as MessageEvent<Sites>, weightContext);
  // capConWorker.postMessage({
  //   densities,
  //   sites,
  //   samples,
  //   // assignments: regionAssignments,
  //   width: imgWidth,
  //   height: imgHeight,
  // });

  /**
   * Entire Processing Pipeline
   * - Make Densities with grayscale image data grayscale
   * - Use Rejection Sampling for Sample points
   *   - Use Sub-sample for Weighted Voronoi sites
   *     - Use final Weighted Sites and all Samples for Capacity Constrained Voronoi
   */
  greyWorker.onmessage = (ev: MessageEvent<Float64Array>) => {
    const points = ev.data;
    // Invert Lightness Scale to move points to dark areas
    for (let i = 0; i < points.length; ++i) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      points[i] = Math.max(0, 1 - points[i]!);
    }
    densities = points;
    totalDensity = sum(densities);

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

      capConWorker.onmessage = (ev: MessageEvent<RegionAssignments>) => {
        drawDots(ev, capConContext, totalDensity);
      };

      weightedWorker.onmessage = (ev: MessageEvent<WeightedResult>) => {
        drawDots(ev, weightContext, totalDensity);
        if (ev.data.cStar) {
          sites = ev.data.sites;
          // cStar = ev.data.cStar;
          capConWorker.postMessage({
            densities,
            sites,
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
