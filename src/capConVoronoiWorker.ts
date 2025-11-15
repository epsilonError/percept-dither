/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Delaunay } from 'd3-delaunay';
import { iota } from './mathUtils';

// function distance(x0: number, y0: number, x1: number, y1: number) {
//   return Math.sqrt(distanceSq(x0, y0, x1, y1));
// }

function distanceSq(x0: number, y0: number, x1: number, y1: number) {
  return (x0 - x1) ** 2 + (y0 - y1) ** 2;
}

self.onmessage = (
  event: MessageEvent<{
    numSites: number;
    maxCapacity: number;
    densities: Float64Array;
    width: number;
    height: number;
    numSamples: number;
  }>,
) => {
  const { numSites, densities, width, height, numSamples } = event.data;

  if (numSamples / numSites < 1)
    throw new Error('Too few Samples and/or too many generator Sites');

  // Initialization Data Structures
  const sites = new Float64Array(numSites * 2);
  const siteCapacities = new Uint32Array(numSites);
  const samples = new Float64Array(numSamples * 2);
  // Book-keeping Data Structures
  const regionContains = new Array<Set<number>>(numSites);
  const siteStabilities = new Array<boolean>(numSites);

  console.log('Initializing Sites and Capacities');
  siteStabilities.fill(false);
  let overallCapacity = numSamples;
  /**
   * Initialize Random Sites and their Capacities
   */
  for (let i = 0; i < numSites; ++i) {
    /*x*/ sites[i * 2] = Math.floor(Math.random() * width);
    /*y*/ sites[1 + i * 2] = Math.floor(Math.random() * height);

    const capacity = Math.floor(overallCapacity / (numSites - i));
    overallCapacity -= capacity;
    siteCapacities[i] = capacity >>> 0;

    siteStabilities[i] = false;
  }
  if (siteCapacities.reduce((acc, cur) => acc + cur, 0) !== numSamples)
    throw new Error('The generator Sites cannot contain all the Samples');

  console.log('Rejection Sampling Sample Points');
  const maxDensity = densities.reduce((m, cur) => Math.max(m, cur), 0);
  /** Scale the comparison since the range of the random numbers is [0,1) */
  const scale = maxDensity < 1 ? 1 : maxDensity + 0.001;
  /**
   * Initialize Sample Points
   * - find through rejection sampling
   */
  for (let i = 0; i < numSamples; ++i) {
    const x = (samples[i * 2] = Math.floor(Math.random() * width));
    const y = (samples[1 + i * 2] = Math.floor(Math.random() * height));
    const u = Math.random();
    const comp = densities[x + y * width]! / scale;
    if (u < comp) {
      /* Accepted */
    } else {
      --i;
    }
  }

  postMessage(samples);

  console.log('Assign Regions unique Sample Points');
  /**
   * Fill Regions with unique Sample Points
   */
  let delaunay = new Delaunay(samples);
  let voronoi = delaunay.voronoi([0, 0, width, height]);
  const notAssigned = new Set<number>(iota(numSamples));
  for (let i = 0, j = 0; i < numSites; ++i) {
    /** The set of Samples this site will contain */
    const result = new Set<number>();
    const capacity = siteCapacities[i]!;
    /** The set of Samples we've found the neighbors of */
    const seen = new Set<number>();
    /**
     * The next closest neighbors
     * - Seeded with the Sample closest to this Site
     */
    const neighbors = new Set([
      (j = delaunay.find(sites[i * 2]!, sites[1 + i * 2]!, j)),
    ]);
    /** The neighbors of neighbors */
    const nextNeighbors: Iterable<number>[] = [];

    while (result.size < capacity) {
      for (const candidate of neighbors) {
        if (notAssigned.has(candidate)) {
          result.add(candidate);
          notAssigned.delete(candidate);
          if (result.size === capacity) break;
        }

        if (!seen.has(candidate)) {
          nextNeighbors.push(voronoi.neighbors(candidate));
          seen.add(candidate);
        }
      }
      if (result.size === capacity) break;
      neighbors.clear();

      for (const iter of nextNeighbors) {
        for (const neighbor of iter) {
          neighbors.add(neighbor);
        }
      }
      nextNeighbors.length = 0;

      // No Neighbors were found, fill from Not Assigned
      if (neighbors.size === 0) {
        for (const leftover of notAssigned) {
          neighbors.add(leftover);
        }
      }
    }

    regionContains[i] = result;
  }

  postMessage(sites);

  if (notAssigned.size !== 0)
    throw new Error('Not all Samples were assigned to a Site.');
  if (
    regionContains.map((x) => x.size).reduce((a, c) => a + c, 0) !== numSamples
  )
    throw new Error("Voronoi Regions don't contain all samples.");

  console.log('Updating Initial Sites');
  /**
   * Update Sites based on their now initialized Region
   */
  for (const id of iota(numSites)) {
    const enclosedSamples = regionContains[id];
    if (enclosedSamples) {
      [sites[id * 2], sites[1 + id * 2]] = centroid(enclosedSamples, samples);
    } else {
      throw new Error("There isn't a region for each site!");
    }
  }
  postMessage(sites);

  interface HeapKey {
    sampleId: number;
    energyDiff: number;
  }
  function point(id: number, source: Float64Array) {
    return [source[id * 2]!, source[1 + id * 2]!] as const;
  }
  function heapElement(
    sampleId: number,
    compareA: readonly [number, number],
    compareB: readonly [number, number],
  ): HeapKey {
    const loc = point(sampleId, samples);
    return {
      sampleId,
      energyDiff:
        distanceSq(...loc, ...compareA) - distanceSq(...loc, ...compareB),
    };
  }
  function sortHeap(a: HeapKey, b: HeapKey) {
    return b.energyDiff - a.energyDiff;
  }
  function centroid(points: Iterable<number>, source: Float64Array) {
    let x = 0,
      y = 0,
      count = 0;

    for (const id of points) {
      const [x1, y1] = point(id, source);
      x += x1;
      y += y1;
      ++count;
    }

    x /= count ? count : 1;
    y /= count ? count : 1;
    return [x, y] as const;
  }
  function union<T>(a: Set<T>, b: Set<T>) {
    for (const el of b) {
      a.add(el);
    }
    return a;
  }

  delaunay = new Delaunay(sites);
  voronoi = delaunay.voronoi([0, 0, width, height]);
  const neighborsAndNeighbors = (id: number, depth = 2) => {
    const neighbors = [new Set([id])];

    for (let i = 1; i < depth + 1; ++i) {
      const done = neighbors[i - 1]!;
      const next = new Set<number>();
      for (const src of done) {
        for (const n of voronoi.neighbors(src)) {
          if (!done.has(n)) {
            next.add(n);
          }
        }
      }
      neighbors.push(next);
    }

    const result = neighbors.reduce(union);
    result.delete(id);
    return result;
  };

  console.log('Starting Swapping Process');
  let stable = false;
  const tempStabilities = new Array<boolean>(numSites);
  /**
   * Iteration Loops
   */
  for (let k = 0; k < 20 && !stable; ++k) {
    console.log('Iteration:', k);
    tempStabilities.fill(true);

    // Iterate through points and their neighbors
    for (const i of iota(numSites)) {
      for (const j of neighborsAndNeighbors(i, 5)) {
        const iLocation = point(i, sites);
        const jLocation = point(j, sites);

        const iSamples = regionContains[i]!;
        const jSamples = regionContains[j]!;

        const heap_i = Array.from(iSamples, (sampleId) =>
          heapElement(sampleId, iLocation, jLocation),
        ).sort(sortHeap);
        const heap_j = Array.from(jSamples, (sampleId) =>
          heapElement(sampleId, jLocation, iLocation),
        ).sort(sortHeap);

        while (
          heap_i.length > 0 &&
          heap_j.length > 0 &&
          heap_i[0]!.energyDiff + heap_j[0]!.energyDiff > 0
        ) {
          const swap_i = heap_i.shift()!.sampleId,
            swap_j = heap_j.shift()!.sampleId;
          iSamples.add(swap_j);
          jSamples.add(swap_i);
          iSamples.delete(swap_i);
          jSamples.delete(swap_j);
        }

        if (heap_i.length < iSamples.size) {
          tempStabilities[i] = false;
          tempStabilities[j] = false;
          [sites[i * 2], sites[1 + i * 2]] = centroid(iSamples, samples);
          [sites[j * 2], sites[1 + j * 2]] = centroid(jSamples, samples);
        }

        heap_i.length = 0;
        heap_j.length = 0;
      }
      postMessage(sites);
    }
    voronoi.update();

    // Stability check
    stable = true;
    for (let idx = 0; idx < numSites; ++idx) {
      siteStabilities[idx] = tempStabilities[idx]!;
      stable &&= tempStabilities[idx]!;
    }
    console.log('Iteration is Stable:', stable);
    postMessage(sites);
  }
  console.log('Finished!');

  const capacityOfSite = new Float64Array(numSites);
  let totalCapacity = 0;

  capacityOfSite.fill(0);
  totalCapacity = 0;
  for (let x = 0, i = 0; x < width; ++x) {
    for (const y of iota(height)) {
      const w = densities[x + y * width]!;
      i = delaunay.find(x, y, i);
      capacityOfSite[i]! += w;
      totalCapacity += w;
    }
  }
  const cStar = totalCapacity / numSites;
  const normCapErr =
    capacityOfSite
      .map((c) => Math.pow(c / cStar - 1, 2))
      .reduce((acc, cur) => acc + cur, 0) / numSites;

  console.log(
    'Actual Capacity:',
    siteCapacities,
    '\nTheorectical Capacities:',
    capacityOfSite,
  );
  console.log('C* =', cStar);
  console.log('Normalized Capacity Error:', normCapErr);

  close();
};
