import { Vector3, Float32BufferAttribute, BufferAttribute, BufferGeometry } from "three";

/**
 * Creates a BufferGeometry by sweeping a 2D shape along a polyline path,
 * using miter joints at each interior vertex so adjacent segments meet cleanly.
 *
 * @param {import("three").Shape} shape - A Three.js Shape whose 2D points define the cross-section.
 * @param {Vector3[]} points - An array of Vector3 positions forming the polyline path.
 * @returns {BufferGeometry} A non-indexed BufferGeometry ready for rendering.
 */
export function createMiterGeometry(shape, points) {
  if (points.length < 2) return new BufferGeometry();

  const shapePoints = shape.getPoints();
  const vertexCount = shapePoints.length * points.length;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = [];

  let pathDist = 0;

  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      pathDist += points[i].distanceTo(points[i - 1]);
    }

    let R = new Vector3();
    let U = new Vector3();
    let miterScaleX = 1;

    if (i === 0) {
      const d = new Vector3().subVectors(points[1], points[0]).normalize();
      R.crossVectors(d, new Vector3(0, 1, 0)).normalize();
      U.crossVectors(R, d).normalize();
    } else if (i === points.length - 1) {
      const d = new Vector3().subVectors(points[i], points[i - 1]).normalize();
      R.crossVectors(d, new Vector3(0, 1, 0)).normalize();
      U.crossVectors(R, d).normalize();
    } else {
      const d1 = new Vector3().subVectors(points[i], points[i - 1]).normalize();
      const d2 = new Vector3().subVectors(points[i + 1], points[i]).normalize();

      const n = new Vector3().addVectors(d1, d2).normalize();

      if (n.lengthSq() < 0.001) {
        // Fallback for 180 degree turns
        R.crossVectors(d1, new Vector3(0, 1, 0)).normalize();
        U.crossVectors(R, d1).normalize();
      } else {
        R.crossVectors(n, new Vector3(0, 1, 0)).normalize();
        U.crossVectors(R, n).normalize();

        const r1 = new Vector3().crossVectors(d1, new Vector3(0, 1, 0)).normalize();
        const dot = R.dot(r1);
        if (dot > 0.01) {
          miterScaleX = 1 / dot;
        }
      }
    }

    for (let j = 0; j < shapePoints.length; j++) {
      const sp = shapePoints[j];
      // Based on original ExtrudeGeometry mapping: Shape X maps to UP, Shape Y maps to RIGHT
      const pos = new Vector3()
        .copy(points[i])
        .addScaledVector(U, -sp.x)
        .addScaledVector(R, -sp.y * miterScaleX);

      const offset = (i * shapePoints.length + j) * 3;
      positions[offset] = pos.x;
      positions[offset + 1] = pos.y;
      positions[offset + 2] = pos.z;

      const uvOffset = (i * shapePoints.length + j) * 2;
      uvs[uvOffset] = j / (shapePoints.length - 1 || 1);
      uvs[uvOffset + 1] = pathDist;
    }
  }

  for (let i = 0; i < points.length - 1; i++) {
    for (let j = 0; j < shapePoints.length - 1; j++) {
      const a = i * shapePoints.length + j;
      const b = i * shapePoints.length + j + 1;
      const c = (i + 1) * shapePoints.length + j;
      const d = (i + 1) * shapePoints.length + j + 1;

      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  const nonIndexedGeo = geo.toNonIndexed();
  nonIndexedGeo.computeVertexNormals();

  // Rapier's trimesh collider builder strictly requires an index buffer
  // (it reads geometry.index.array). After toNonIndexed() strips the shared
  // index, we add a trivial identity index (0, 1, 2, 3, ...) so trimesh
  // works without re-sharing vertices — preserving flat shading.
  const positionCount = nonIndexedGeo.attributes.position.count;
  const newIndices = new Uint32Array(positionCount);
  for (let i = 0; i < positionCount; i++) {
    newIndices[i] = i;
  }
  nonIndexedGeo.setIndex(new BufferAttribute(newIndices, 1));

  return nonIndexedGeo;
}
