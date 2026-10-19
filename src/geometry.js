import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
// Chamfered hard-surface block: six planar faces, twelve bevels and eight clipped corners.
// Separate face vertices preserve clean machining normals instead of balloon-like smoothing.
export function machinedBox(name, width, height, depth, scene, bevel = .004) {
  const half = [width / 2, height / 2, depth / 2], b = Math.min(bevel, ...half.map(v => v * .25));
  const positions = [], indices = [], uvs = [];
  function face(points, normal) {
    const a = Vector3.FromArray(points[0]), c = Vector3.FromArray(points[1]), d = Vector3.FromArray(points[2]);
    if (Vector3.Dot(Vector3.Cross(c.subtract(a), d.subtract(a)), Vector3.FromArray(normal)) < 0) points.reverse();
    const start = positions.length / 3;
    points.forEach((p, i) => { positions.push(...p); uvs.push(i === 0 || i === 3 ? 0 : 1, i < 2 ? 0 : 1); });
    for (let i = 1; i < points.length - 1; i++) indices.push(start, start + i + 1, start + i);
  }
  // Main faces.
  for (let axis = 0; axis < 3; axis++) for (const sign of [-1, 1]) {
    const a = (axis + 1) % 3, c = (axis + 2) % 3, normal = [0, 0, 0]; normal[axis] = sign;
    const points = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([s, t]) => { const p = [0, 0, 0]; p[axis] = half[axis] * sign; p[a] = (half[a] - b) * s; p[c] = (half[c] - b) * t; return p; }); face(points, normal);
  }
  // Edge bevels parallel to each axis.
  for (let axis = 0; axis < 3; axis++) for (const s of [-1, 1]) for (const t of [-1, 1]) {
    const a = (axis + 1) % 3, c = (axis + 2) % 3, normal = [0, 0, 0]; normal[a] = s; normal[c] = t;
    const points = [[-1, 0], [1, 0], [1, 1], [-1, 1]].map(([end, type]) => { const p = [0, 0, 0]; p[axis] = (half[axis] - b) * end; p[a] = (half[a] - (type ? b : 0)) * s; p[c] = (half[c] - (type ? 0 : b)) * t; return p; }); face(points, normal);
  }
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const signs = [x, y, z], points = [0, 1, 2].map(axis => half.map((v, i) => (v - (i === axis ? 0 : b)) * signs[i])); face(points, signs);
  }
  const normals = []; VertexData.ComputeNormals(positions, indices, normals);
  const data = new VertexData(); data.positions = positions; data.indices = indices; data.normals = normals; data.uvs = uvs;
  const mesh = new Mesh(name, scene); data.applyToMesh(mesh); return mesh;
}
