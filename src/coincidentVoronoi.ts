import { Delaunay, Voronoi } from 'd3-delaunay';

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
}
