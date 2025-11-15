/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Delaunay } from 'd3-delaunay';
import { iota } from './mathUtils';

self.onmessage = (
  event: MessageEvent<{
    densities: Float64Array;
    width: number;
    height: number;
    num: number;
  }>,
) => {
  const { densities, width, height, num } = event.data;
  /** The generating sites for the Voronoi Diagram */
  const sites = new Float64Array(num * 2);
  /** The centroid for each Voronoi Region (the x or y position of each point in the region weighted by the point's density)*/
  const centroids = new Float64Array(num * 2);
  /** The density for each centroid (sum of all weights in the region)*/
  const weights = new Float64Array(num);

  const maxDensity = densities.reduce((m, cur) => Math.max(m, cur), 0);
  /** Scale the comparison since the range of the random numbers is [0,1) */
  const scale = maxDensity < 1 ? 1 : maxDensity + 0.001;

  /**
   * Initialize Voronoi
   * - find Sites through rejection sampling
   * - make Voronoi Diagram from Sites
   */
  for (let i = 0; i < num; ++i) {
    const x = (sites[i * 2] = Math.floor(Math.random() * width));
    const y = (sites[1 + i * 2] = Math.floor(Math.random() * height));
    const u = Math.random();
    const comp = densities[x + y * width]! / scale;
    if (u < comp) {
      /* Accepted */
    } else {
      --i;
    }
  }

  const delaunay = new Delaunay<number>(sites);
  const voronoi = delaunay.voronoi([0, 0, width, height]);

  /** Iteratively move Sites to Weighted Centroids, and update Voronoi Diagram */
  for (const k of iota(100)) {
    // Reset Centroids and their Weights
    centroids.fill(0);
    weights.fill(0);

    // Traverse each pixel to calculate the centroids and weights
    for (let x = 0, i = 0; x < width; ++x) {
      for (const y of iota(height)) {
        const w = densities[x + y * width]!;
        i = delaunay.find(x + 0.5, y + 0.5, i);
        weights[i]! += w;
        centroids[i * 2]! += w * (x + 0.5);
        centroids[i * 2 + 1]! += w * (y + 0.5);
      }
    }

    const decay = Math.pow(k + 1, -0.8);
    /**
     * Add centered random displacement, and scale the range based on the iteration count.
     *
     * Max displacement is 5 from the center, and it exponentially decays each iteration.
     */
    const randomDisplacement = () => (Math.random() - 0.5) * decay * 10;

    // Move the Sites towards their Centroid, scaled by the Centroid's Weight
    for (const i of iota(num)) {
      const w = weights[i]!;
      const x0 = sites[i * 2]!,
        y0 = sites[1 + i * 2]!;
      const x1 = w ? centroids[i * 2]! / w : x0,
        y1 = w ? centroids[1 + i * 2]! / w : y0;
      sites[i * 2] = x0 + (x1 - x0) * 1.8 + randomDisplacement();
      sites[1 + i * 2] = y0 + (y1 - y0) * 1.8 + randomDisplacement();
    }

    postMessage(sites);
    voronoi.update();
  }

  // Normalized Capacity Error Calculation
  let totalCapacity = 0;
  weights.fill(0);
  for (let y = 0, i = 0; y < height; ++y) {
    for (const x of iota(width)) {
      const w = densities[y * width + x]!;
      i = delaunay.find(x, y, i);
      weights[i]! += w;
      totalCapacity += w;
    }
  }
  const cStar = totalCapacity / num;
  const normCapErr =
    weights
      .map((c) => Math.pow(c / cStar - 1, 2))
      .reduce((acc, cur) => acc + cur, 0) / num;
  console.log('Capacities:', weights);
  console.log('C* =', cStar);
  console.log('Normalized Capacity Error:', normCapErr);

  close();
};
