import { Vector } from './math';
import { triTable, edgeIndex, cubeVerts } from './marchingcubes-tables';
import { epsilon } from './constants';
export type Bounds = [Vec3, Vec3];
export type Triangle = [Vec3, Vec3, Vec3];

export class MarchingCubes {
  triangles: Triangle[] = [];
  cubeSize: number;
  fn: Shape3;

  constructor(cubeSize: number, shape: Shape3) {
    this.cubeSize = cubeSize;
    this.fn = shape;
  }

  doMarch = (bounds: Bounds) => {
    const [lower, upper] = bounds;
    // evaluate this cube
    const vertexPositions = cubeVerts.map(v =>
      v.map((o: number, i: number) =>
        o ? upper[i] : lower[i]) as Vec3);
    const results = vertexPositions.map(this.fn);
    this._doMarch(vertexPositions, results);

  };

  _divideVolume = (dim: number, results: number[], vertexPositions: Vec3[]) => {
    const lower = vertexPositions[0];
    const upper = vertexPositions[6];
    const halfway = (lower[dim] + upper[dim]) / 2;

    // collapse positions into a plane on the split dimesion
    const collapsedPos = vertexPositions.map((p, i) => {
      const temp = [...p];
      temp[dim] = halfway;
      return temp as Vec3;
    });
    const collapsePairings = [
      [0, 1, 3, 2, 5, 4, 7, 6],
      [3, 2, 1, 0, 7, 6, 5, 4],
      [4, 5, 6, 7, 0, 1, 2, 3]
    ][dim];
    const newResults = []
    for (let i = 0; i < cubeVerts.length; i++) {
      if (newResults[collapsePairings[i]] === undefined) {
        newResults[i] = this.fn(collapsedPos[i]);
      } else {
        newResults[i] = newResults[collapsePairings[i]];
      }
    }

    // axis to poition mapping, lower side perspective
    // 0 - keep original
    // 1 - use halfway number
    const mapping = [
      0b01100110,
      0b00110011,
      0b00001111,
    ][dim];

    // setup data structurs for call
    const results0 = [];
    const vertexPositions0 = [];
    const results1 = [];
    const vertexPositions1 = [];
    for (let i = 0; i < cubeVerts.length; i++) {
      if (mapping & 1 << i) {
        results0[i] = newResults[i];
        vertexPositions0[i] = collapsedPos[i];
        results1[i] = results[i];
        vertexPositions1[i] = vertexPositions[i];
      } else {
        results0[i] = results[i];
        vertexPositions0[i] = vertexPositions[i];
        results1[i] = newResults[i];
        vertexPositions1[i] = collapsedPos[i];
      }
    }

    return {
      results0,
      vertexPositions0,
      results1,
      vertexPositions1
    };
  }

  _doMarch = (vertexPositions: Vec3[], results: number[]) => {
    const lower = vertexPositions[0];
    const upper = vertexPositions[6];
    const steps = new Vector(upper).minus(lower).result;
    const maxLen = Math.max(...steps);
    const maxDim = steps.findIndex(v => v === maxLen);

    const cubeType = results.reduce((a, v, i) => {
      if (v > 0) {
        a |= 1 << i;
      }
      return a;
    }, 0);

    // optimization, if this cube is far away from an edge relative to its own size, we can skip it
    if (Math.min(...results.map(Math.abs)) > maxLen) {
      return;
    }

    // if volume is too large we need to split it
    if (maxLen > this.cubeSize) {
      const { results0, vertexPositions0, results1, vertexPositions1 } = this._divideVolume(maxDim, results, vertexPositions);
      this._doMarch(vertexPositions0, results0);
      this._doMarch(vertexPositions1, results1);
      return;
    }

    // process Triangles
    const triEdges = triTable[cubeType];
    for (let i = 0; i < triEdges.length; i += 3) {
      const triangle: Triangle = [null, null, null];
      for (let j = 0; j < 3; j++) {
        const edgeType = triEdges[i + j];
        // vertices
        const [vertexType1, vertexType2] = edgeIndex[edgeType];
        const p1 = vertexPositions[vertexType1];
        const v1 = results[vertexType1];
        const p2 = vertexPositions[vertexType2];
        const v2 = results[vertexType2];

        triangle[j] = this.interpolate(p1, v1, p2, v2);
      }
      this.triangles.push(triangle);
    }
  }

  interpolate = (p1: Vec3, v1: number, p2: Vec3, v2: number) => {
    // the points are coming in from a cube, find the axis we are moving on
    const limit = 16;
    // we can use this trick, we are on axis cubes, otherwise full vector math is required
    const axis = p1[0] !== p2[0] ? 0 : (p1[1] !== p2[1] ? 1 : 2);
    const temp = [...p1] as Vec3;
    let low = p1[axis];
    let high = p2[axis];
    for (let i = 0; i < limit; i++) {
      const middle = (low + high) / 2;
      temp[axis] = middle;
      const midVal = this.fn(temp);
      if (Math.abs(midVal) < epsilon) {
        break;
      } else if (Math.sign(midVal) === Math.sign(v1)) {
        low = middle;
        v1 = midVal
      } else {
        high = middle;
        v2 = midVal;
      }
      if (i === limit - 1) {
        console.log("reached limit of interpolation", axis, temp, p1, v1, p2, v2);
      }
    }
    return temp;
  }
}