import { Delaunay, Voronoi } from 'd3-delaunay';
import { union } from './mathUtils';

interface NeighborAndNeighborsOptions {
  over: 'individuals' | 'rings';
  acceptPred?: (id: number) => boolean;
}
interface NeighborAndNeighborsIndividuals {
  over: 'individuals';
  acceptPred?: (id: number) => boolean;
}
interface NeighborAndNeighborsRings {
  over: 'rings';
  acceptPred?: (id: number) => boolean;
}

export class CoincidentVoronoi {
  delaunay: Delaunay<number>;
  voronoi: Voronoi<number>;
  width: number;
  #coincidenceMap: Map<number, Set<number>>;
  #coincidentId: Map<number, number>;

  constructor(points: Float64Array, bounds: Delaunay.Bounds) {
    this.width = bounds[2];
    this.delaunay = new Delaunay(points);
    this.voronoi = this.delaunay.voronoi(bounds);
    this.#coincidenceMap = new Map();
    this.#coincidentId = new Map();
    this.#coincident();
  }

  #position(id: number) {
    return {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      x: this.delaunay.points[id * 2]!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      y: this.delaunay.points[1 + id * 2]!,
    };
  }

  find(x: number, y: number, i?: number) {
    return this.delaunay.find(x, y, i);
  }

  update() {
    const result = this.voronoi.update();
    this.#coincident();
    return result;
  }

  *neighbors(i: number): Iterable<number> {
    yield* this.voronoi.neighbors(i);
    if (this.#coincidenceMap.has(i)) {
      for (const id of this.#coincidenceMap.get(i) ?? []) {
        yield id;
        yield* this.#coincidenceMap.get(id) ?? [];
      }
    }
  }

  #coincident() {
    this.#coincidenceMap.clear();
    this.#coincidentId.clear();
    this.delaunay.inedges.forEach((x, i) => {
      if (x === -1) {
        const { x, y } = this.#position(i);
        const foundIndex = this.delaunay.find(x + 0.1, y + 0.1);
        this.#add2Map(foundIndex, i);
        this.#add2Map(i, foundIndex);
      }
    });
  }

  #add2Map(a: number, b: number) {
    if (this.#coincidenceMap.has(a)) {
      this.#coincidenceMap.get(a)?.add(b);
    } else {
      this.#coincidenceMap.set(a, new Set([b]));
    }
  }

  neighborsAndNeighbors(
    id: number,
    depth: number,
    count: number,
    options: NeighborAndNeighborsIndividuals,
  ): Set<number>;
  neighborsAndNeighbors(
    id: number,
    depth: number,
    count: number,
    options: NeighborAndNeighborsRings,
  ): Set<number>[];
  neighborsAndNeighbors(
    id: number,
    depth = 2,
    count = Infinity,
    options: NeighborAndNeighborsOptions = { over: 'individuals' },
  ) {
    const neighbors = [new Set([id])];
    const result = new Set<number>();
    let rejectCount = 0;

    for (let i = 1; i < depth + 1; ++i) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const last = neighbors[i - 1]!;
      union(result, last);
      if (result.size >= count + 1 + rejectCount) break;
      const next = new Set<number>();
      for (const src of last) {
        for (const n of this.neighbors(src)) {
          if (!result.has(n)) {
            if (options.acceptPred ? !options.acceptPred(n) : false) {
              ++rejectCount;
            }
            next.add(n);
          }
        }
      }
      neighbors.push(next);
      if (next.size === 0) break;
    }

    if (options.over === 'individuals') {
      result.delete(id);
      if (rejectCount > 0 && options.acceptPred) {
        for (const candidate of result) {
          if (!options.acceptPred(candidate)) {
            result.delete(candidate);
          }
        }
      }
      neighbors.length = 0;
      return result;
    } /*(options.over === 'rings')*/ else {
      neighbors.shift();
      if (rejectCount > 0 && options.acceptPred) {
        for (const ring of neighbors) {
          for (const candidate of ring) {
            if (!options.acceptPred(candidate)) {
              ring.delete(candidate);
            }
          }
        }
      }
      result.clear();
      return neighbors;
    }
  }
}
