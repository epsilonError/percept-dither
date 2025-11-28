/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { distanceSq, iota } from './mathUtils';
import { CoincidentVoronoi } from './coincidentVoronoi';
import type { Sites } from './weightedVoronoiWorker';

export interface RegionAssignments extends Sites {
  regionAssignments: Uint32Array;
  capacities: Uint32Array;
}

self.onmessage = (
  event: MessageEvent<{
    sites: Float64Array;
    densities: Float64Array;
    samples: Float64Array;
    assignments?: Uint32Array;
    capacities?: Uint32Array;
    width: number;
    height: number;
  }>,
) => {
  const { sites, densities, samples, width, height, assignments, capacities } =
    event.data;
  const numSites = sites.length / 2;
  const numSamples = samples.length / 2;
  const assignmentOffset = Math.ceil(numSamples / numSites);

  if (numSamples / numSites < 1)
    throw new Error('Too few Samples and/or too many generator Sites');

  // Initialization Data Structures
  const siteCapacities = new Uint32Array(numSites);
  const regionAssignments = new Uint32Array(assignmentOffset * numSites);
  regionAssignments.fill(NaN);
  // Book-keeping Data Structures
  const siteStabilities = new Array<boolean>(numSites);
  siteStabilities.fill(false);
  const siteSqRadii = new Float64Array(numSites);
  // const sampleDistSq = new Float64Array(numSamples);
  let voronoi: CoincidentVoronoi;

  if (capacities) {
    console.log('Using Provided Capacities');
    for (let i = 0; i < capacities.length; ++i) {
      siteCapacities[i] = capacities[i]!;
    }
  } else {
    console.log('Initializing Capacities');
    let overallCapacity = numSamples;
    /**
     * Initialize Capacities
     */
    for (const i of iota(numSites)) {
      const capacity = Math.floor(overallCapacity / (numSites - i));
      overallCapacity -= capacity;
      siteCapacities[i] = capacity >>> 0;
    }
  }
  if (siteCapacities.reduce((acc, cur) => acc + cur, 0) !== numSamples)
    throw new Error('The generator Sites cannot contain all the Samples');

  postMessage({ sites: samples });
  if (assignments) {
    console.log('Using Pre-Assigned Regions');
    for (let i = 0; i < assignments.length; ++i) {
      regionAssignments[i] = assignments[i]!;
    }
  } else {
    console.log('Assign Regions unique Sample Points');
    /**
     * Fill Regions with unique Sample Points
     */
    voronoi = new CoincidentVoronoi(samples, [0, 0, width, height]);

    const notAssigned = new Set<number>(iota(numSamples));
    for (let i = 0, j = 0; i < numSites; ++i) {
      /** The set of Samples this site will contain */
      const capacity = siteCapacities[i]!;
      /**
       * The Sample closest to this Site
       */
      const seed = (j = voronoi.find(
        sites[i * 2]! + 0.1,
        sites[1 + i * 2]! + 0.1,
        j,
      ));

      /** Index of Sample in Region */
      let idx = 0;
      // Assign the Seed if possible
      if (notAssigned.has(seed)) {
        regionAssignments[idx++ + i * assignmentOffset] = seed;
        notAssigned.delete(seed);
        if (idx === capacity) continue;
      }

      // Set of Neighbors from Seed
      // - Infinite Depth Possible
      // - Collect at least the Capacity still needed
      // - Only accept Points that haven't been assigned yet
      const neighbors = voronoi.neighborsAndNeighbors(
        seed,
        Infinity,
        capacity - idx,
        { over: 'individuals', acceptPred: (n) => notAssigned.has(n) },
      );

      for (const neighbor of neighbors) {
        if (idx < capacity) {
          regionAssignments[idx++ + i * assignmentOffset] = neighbor;
          notAssigned.delete(neighbor);
        }
        if (idx === capacity) break;
      }
      // console.log('Assigned', result.size, 'of', capacity, 'Samples Points.');
    }
    if (notAssigned.size !== 0) {
      console.log('Not Assigned:', notAssigned);
      throw new Error('Not all Samples were assigned to a Site.');
    }
  }
  const uniqueSamples = new Set(regionAssignments);
  uniqueSamples.delete(NaN);
  if (uniqueSamples.size !== numSamples)
    throw new Error("Voronoi Regions don't contain all samples.");

  console.log('Samples Norm Cap Err:');
  normCapErr(densities, new CoincidentVoronoi(samples, [0, 0, width, height]));

  postMessage({
    sites,
    regionAssignments,
    capacities: siteCapacities,
  } as RegionAssignments);

  console.log('Initialize Sites Bookkeeping');
  /**
   * Iterable of SampleIds assigned to a Region
   */
  const assignedToRegion = function* (siteId: number): Iterable<number> {
    for (const i of iota(assignmentOffset)) {
      const result = regionAssignments[i + assignmentOffset * siteId] ?? NaN;
      if (!Number.isNaN(result)) {
        yield result;
      } else {
        break;
      }
    }
  };

  /**
   * Update Sites based on their now initialized Region
   */
  const update = (id: number): void => {
    const location = point(id, sites);
    let squaredRadius = 0;
    for (const sample of assignedToRegion(id)) {
      squaredRadius = Math.max(
        squaredRadius,
        distanceSq(location, point(sample, samples)),
      );
    }
    siteSqRadii[id] = squaredRadius;
  };
  // Initialize book-keeping and precalculations
  siteSqRadii.fill(0);
  for (const id of iota(numSites)) {
    const enclosedSamples = Array.from(assignedToRegion(id));
    if (enclosedSamples.length !== 0) {
      // [sites[id * 2], sites[1 + id * 2]] = centroid(enclosedSamples, samples);
    } else {
      throw new Error("There isn't a region for each site!");
    }
    update(id);
  }

  interface HeapKey {
    sampleId: number;
    swapLocation: number;
    energyDiff: number;
  }
  function heapElement(
    sampleId: number,
    swapLocation: number,
    compareA: readonly [number, number],
    compareB: readonly [number, number],
  ): HeapKey {
    const loc = point(sampleId, samples);
    return {
      sampleId,
      swapLocation,
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

  console.log('\nOriginal Sites Norm Cap Err:');
  normCapErr(densities, voronoi);
  function regionAssignmentsFromVoronoi(
    samples: Float64Array,
    voronoi: CoincidentVoronoi,
  ): Set<number>[] {
    const result = new Array<Set<number>>(voronoi.numPoints);
    for (let i = 0, k = 0; i < samples.length / 2; ++i) {
      const [x, y] = point(i, samples);
      k = voronoi.find(x, y, k);
      if (result[k] === undefined) {
        result[k] = new Set([i]);
      } else {
        result[k]?.add(i);
      }
    }
    return result;
  }
  normCapErrRegion(
    densities,
    samples,
    regionAssignmentsFromVoronoi(samples, voronoi),
  );
  console.log();

  console.log('Starting Swapping Process');
  /** Tracks the current steady/stable state of the swaps */
  let steady = false;
  /** Tracks if the swaps were stable at least once in the past */
  let stable = false;
  const tempStabilities = new Array<boolean>(numSites);
  /**
   * Iteration Loops
   */
  for (let k = 0; k < Infinity && !(stable && steady); ++k) {
    console.log('Iteration:', k);
    tempStabilities.fill(true);
    const visited = new Array<number>();

    /** Prioritize Sites with the longest radii,
     *  for this first 3 iterations and the last one/few
     */
    const orderedSites = () =>
      k < 3 || stable
        ? Array.from(iota(numSites)).sort(
            (a, b) => siteSqRadii[b]! - siteSqRadii[a]!,
          )
        : iota(numSites);

    // Iterate through prioritized sites and their neighbors
    for (const i of orderedSites()) {
      visited.length = 0;
      /**
       * Nearest intersecting regions with Site i.
       *
       * For the first 2 iterations, checks every possible site.
       * Afterwards, only checks until 2 empty rings of neighbors occur
       * And for the last one/few, check every possible site again.
       */
      const intersectingRegions = voronoi.neighborsAndNeighbors(
        i,
        Infinity,
        Infinity,
        {
          over: k < 2 || stable ? 'individuals' : 'rings',
          acceptPred: (n) =>
            Math.sqrt(distanceSq(point(i, sites), point(n, sites))) <
            Math.sqrt(siteSqRadii[i]!) + Math.sqrt(siteSqRadii[n]!),
        },
      );

      for (const j of intersectingRegions) {
        visited.push(j);
        let swapped = false;

        const iLocation = point(i, sites);
        const jLocation = point(j, sites);

        const iSamples = assignedToRegion(i);
        const jSamples = assignedToRegion(j);

        /** Index of SampleId in Region assignment */
        let idx = 0;
        const heap_i = Array.from(iSamples, (sampleId) =>
          heapElement(
            sampleId,
            idx++ + assignmentOffset * i,
            iLocation,
            jLocation,
          ),
        ).sort(sortHeap);
        idx = 0;
        const heap_j = Array.from(jSamples, (sampleId) =>
          heapElement(
            sampleId,
            idx++ + assignmentOffset * j,
            jLocation,
            iLocation,
          ),
        ).sort(sortHeap);

        while (
          heap_i.length > 0 &&
          heap_j.length > 0 &&
          heap_i[0]!.energyDiff + heap_j[0]!.energyDiff > 0
        ) {
          swapped = true;
          const swap_i = heap_i.shift()!,
            swap_j = heap_j.shift()!;
          regionAssignments[swap_i.swapLocation] = swap_j.sampleId;
          regionAssignments[swap_j.swapLocation] = swap_i.sampleId;
        }

        if (swapped) {
          console.log('Swapped!');
          tempStabilities[i] = false;
          tempStabilities[j] = false;
          [sites[i * 2], sites[1 + i * 2]] = centroid(
            assignedToRegion(i),
            samples,
          );
          [sites[j * 2], sites[1 + j * 2]] = centroid(
            assignedToRegion(j),
            samples,
          );
          update(i);
          update(j);
        }

        heap_i.length = 0;
        heap_j.length = 0;
      }

      postMessage({ sites });
      // console.log(
      //   'Visited:',
      //   visited.length,
      //   'Revisited:',
      //   visited.length - new Set(visited).size,
      // );
    }
    voronoi.update();
    normCapErr(densities, voronoi);

    // Stability check
    steady = true;
    for (let idx = 0; idx < numSites; ++idx) {
      siteStabilities[idx] = tempStabilities[idx]!;
      steady &&= tempStabilities[idx]!;
    }
    // Once Steady, set Stable and reset Steady
    if (steady && !stable) {
      stable = true;
      steady = false;
    }
    console.log('Iteration is Steady:', steady, 'Stable:', stable);
    postMessage({ sites });
  }
  console.log('Finished!');

  console.log('\nTotal Density');
  normCapErr(densities, voronoi, true);
  console.log('Region Density');
  normCapErrRegion(
    densities,
    samples,
    Array.from(iota(numSites), (id) => assignedToRegion(id)),
    true,
  );

  /** Normalized Capacity Error for all points within a Voronoi Region */
  function normCapErr(
    densities: Float64Array,
    voronoi: CoincidentVoronoi,
    verbose = false,
  ) {
    const { cStar, normCapErrDens, capacityOfSite } =
      normalizedCapacityErrorDensities(densities, voronoi);
    if (verbose) {
      console.log(
        'Actual Capacity:',
        siteCapacities,
        '\nTheoretical Capacities:',
        capacityOfSite,
      );
      console.log('C* =', cStar);
    }
    console.log('Voronoi Normalized Capacity Error:', normCapErrDens);
    if (verbose) console.log();
  }

  /** Normalized Capacity Error for Sample Points within an Assignment Region */
  function normCapErrRegion(
    densities: Float64Array,
    samples: Float64Array,
    assignments: Iterable<number>[],
    verbose = false,
  ) {
    const { cStar, cPrimeStar, normCapErrRegs, capacityOfSite } =
      normalizedCapacityErrorRegions(densities, samples, assignments, width);

    if (verbose) {
      console.log(
        'Actual Capacities:',
        siteCapacities,
        '\nTheoretical Capacities:',
        capacityOfSite,
      );
      console.log('C* =', cStar);
      console.log('C′* =', cPrimeStar);
    }
    console.log('Region Normalized Capacity Error:', normCapErrRegs);
  }

  close();
};

export function normalizedCapacityErrorDensities(
  densities: Float64Array,
  voronoi: CoincidentVoronoi,
) {
  const capacityOfSite = new Float64Array(voronoi.numPoints);
  let totalCapacity = 0;

  capacityOfSite.fill(0);
  totalCapacity = 0;
  for (let x = 0, i = 0; x < voronoi.width; ++x) {
    for (const y of iota(voronoi.height)) {
      const w = densities[x + y * voronoi.width]!;
      i = voronoi.find(x, y, i);
      capacityOfSite[i]! += w;
      totalCapacity += w;
    }
  }
  const cStar = totalCapacity / voronoi.numPoints;
  const normCapErrDens =
    capacityOfSite.reduce((acc, cur) => acc + Math.pow(cur / cStar - 1, 2), 0) /
    voronoi.numPoints;

  return { cStar, normCapErrDens, capacityOfSite };
}

function point(id: number, source: Float64Array) {
  return [source[id * 2]!, source[1 + id * 2]!] as const;
}

function normalizedCapacityErrorRegions(
  densities: Float64Array,
  samples: Float64Array,
  assignments: Iterable<number>[],
  width: number,
) {
  const numSites = assignments.length;
  const capacityOfSite = new Float64Array(assignments.length);
  let totalCapacity = 0;

  capacityOfSite.fill(0);
  totalCapacity = 0;
  for (const id of iota(numSites)) {
    for (const sample of assignments[id] ?? []) {
      const [x, y] = point(sample, samples);
      const w = densities[x + y * width] ?? 0;
      capacityOfSite[id]! += w;
      totalCapacity += w;
    }
  }
  const cPrimeStar = totalCapacity / numSites;
  const cStar = densities.reduce((acc, cur) => acc + cur, 0) / numSites;
  const normCapErrRegs =
    capacityOfSite.reduce((acc, cur) => acc + Math.pow(cur / cStar - 1, 2), 0) /
    numSites;

  return { cStar, cPrimeStar, normCapErrRegs, capacityOfSite };
}
