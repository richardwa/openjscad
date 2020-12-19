/// <reference path="./types.d.ts" />

import * as fs from 'fs';
import marchingCubes from './marchingcubes';

type Props = {
  name: string;
  shape: Shape3;
  resolution: Vec3;
  bounds: [Vec3, Vec3];
  outDir?: string;
}

export function render(p: Props) {
  const mesh = marchingCubes(p.resolution, p.shape, p.bounds);
  const faces = mesh.faces;
  const vertices = mesh.vertices;
  const outDir = p.outDir || "./target";
  const os = fs.createWriteStream(`${outDir}/${p.name}.obj`);

  //write obj file
  for (const pos of vertices) {
    os.write("v " + pos.join(' ') + '\n');
  }

  for (const face of faces) {
    os.write("f " + face.map(i => i + 1).join(' ') + '\n');
  }
}
