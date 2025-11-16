/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { distanceSq, iota } from './mathUtils';
import { CoincidentVoronoi } from './coincidentVoronoi';
import type { Sites } from './weightedVoronoiWorker';

export interface RegionAssignments extends Sites {
  regionAssignments: Set<number>[];
  capacities: Uint32Array;
}

self.onmessage = (
  event: MessageEvent<{
    sites: Float64Array;
    densities: Float64Array;
    samples: Float64Array;
    assignments?: Set<number>[];
    width: number;
    height: number;
  }>,
) => {
  const { sites, densities, samples, width, height, assignments } = event.data;
  const numSites = sites.length / 2;
  const numSamples = samples.length / 2;

  if (numSamples / numSites < 1)
    throw new Error('Too few Samples and/or too many generator Sites');

  // Initialization Data Structures
  const siteCapacities = new Uint32Array(numSites);
  // Book-keeping Data Structures
  const regionContains = assignments ?? new Array<Set<number>>(numSites);
  const siteStabilities = new Array<boolean>(numSites);
  let voronoi: CoincidentVoronoi;

  console.log('Initializing Capacities');
  siteStabilities.fill(false);
  let overallCapacity = numSamples;
  /**
   * Initialize Capacities
   */
  for (const i of iota(numSites)) {
    const capacity = Math.floor(overallCapacity / (numSites - i));
    overallCapacity -= capacity;
    siteCapacities[i] = capacity >>> 0;

    siteStabilities[i] = false;
  }
  if (siteCapacities.reduce((acc, cur) => acc + cur, 0) !== numSamples)
    throw new Error('The generator Sites cannot contain all the Samples');

  postMessage({ sites: samples });
  if (assignments) {
    console.log('Using Pre-Assigned Regions');
  } else {
    console.log('Assign Regions unique Sample Points');
    /**
     * Fill Regions with unique Sample Points
     */
    voronoi = new CoincidentVoronoi(samples, [0, 0, width, height]);

    const notAssigned = new Set<number>(iota(numSamples));
    for (let i = 0, j = 0; i < numSites; ++i) {
      /** The set of Samples this site will contain */
      const result = new Set<number>();
      const capacity = siteCapacities[i]!;
      /**
       * The Sample closest to this Site
       */
      const seed = (j = voronoi.find(
        sites[i * 2]! + 0.1,
        sites[1 + i * 2]! + 0.1,
        j,
      ));

      // Assign the Seed if possible
      if (notAssigned.has(seed)) {
        result.add(seed);
        notAssigned.delete(seed);
      }

      // Set of Neighbors from Seed
      // - Infinite Depth Possible
      // - Collect at least the Capacity still needed
      // - Only accept Points that haven't been assigned yet
      const neighbors = voronoi.neighborsAndNeighbors(
        seed,
        Infinity,
        capacity - result.size,
        { over: 'individuals', acceptPred: (n) => notAssigned.has(n) },
      );

      for (const neighbor of neighbors) {
        if (result.size < capacity) {
          result.add(neighbor);
          notAssigned.delete(neighbor);
        }
        if (result.size === capacity) break;
      }

      regionContains[i] = result;
      console.log('Assigned', result.size, 'of', capacity, 'Samples Points.');
    }
    if (notAssigned.size !== 0)
      throw new Error('Not all Samples were assigned to a Site.');
    console.log('Not Assigned:', notAssigned);
  }

  if (
    regionContains.map((x) => x.size).reduce((a, c) => a + c, 0) !== numSamples
  )
    throw new Error("Voronoi Regions don't contain all samples.");

  postMessage({
    sites,
    regionAssignments: regionContains,
    capacities: siteCapacities,
  } as RegionAssignments);

  // console.log('Updating Initial Sites');
  /**
   * Update Sites based on their now initialized Region
   */
  // Skip Update, mainly useful for book-keeping and precalculations
  // for (const id of iota(numSites)) {
  //   const enclosedSamples = regionContains[id];
  //   if (enclosedSamples) {
  //     // [sites[id * 2], sites[1 + id * 2]] = centroid(enclosedSamples, samples);
  //   } else {
  //     throw new Error("There isn't a region for each site!");
  //   }
  // }
  // postMessage({ sites });

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
      energyDiff: distanceSq(loc, compareA) - distanceSq(loc, compareB),
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

  voronoi = new CoincidentVoronoi(sites, [0, 0, width, height]);

  console.log('Starting Swapping Process');
  let stable = false;
  const tempStabilities = new Array<boolean>(numSites);
  /**
   * Iteration Loops
   */
  for (let k = 0 /*, numRings = Infinity*/; k < Infinity && !stable; ++k) {
    console.log('Iteration:', k);
    tempStabilities.fill(true);

    // Iterate through points and their neighbors
    for (const i of iota(numSites)) {
      const rings = voronoi.neighborsAndNeighbors(i, Infinity, Infinity, {
        over: 'rings',
        acceptPred: (n) => n > i,
      });
      // numRings = Math.min(numRings, rings.length);
      for (const ring of rings) {
        for (const j of ring) {
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
            voronoi.update();
          }

          heap_i.length = 0;
          heap_j.length = 0;
        }
      }
      postMessage({ sites });
    }
    voronoi.update();

    // Stability check
    stable = true;
    for (let idx = 0; idx < numSites; ++idx) {
      siteStabilities[idx] = tempStabilities[idx]!;
      stable &&= tempStabilities[idx]!;
    }
    console.log('Iteration is Stable:', stable);
    postMessage({ sites });
  }
  console.log('Finished!');

  const capacityOfSite = new Float64Array(numSites);
  let totalCapacity = 0;

  capacityOfSite.fill(0);
  totalCapacity = 0;
  for (let x = 0, i = 0; x < width; ++x) {
    for (const y of iota(height)) {
      const w = densities[x + y * width]!;
      i = voronoi.find(x, y, i);
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
