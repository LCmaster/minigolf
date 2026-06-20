import { Vector3, Float32BufferAttribute, BufferAttribute, BufferGeometry } from "three";

/**
 * Computes coordinate frames (position, up, right, miterScaleX, and path distance) 
 * at each point of a polyline path to support miter joint sweeps.
 * 
 * @param {Vector3[]} points - Array of Vector3 points representing the track spine.
 * @returns {Array<{ p: Vector3, U: Vector3, R: Vector3, miterScaleX: number, pathDist: number }>}
 */
export function computeMiterPathData(points) {
  if (points.length < 2) return [];

  const pathData = [];
  let pathDist = 0;

  for (let i = 0; i < points.length; i++) {
    if (i > 0) {
      pathDist += points[i].distanceTo(points[i - 1]);
    }

    let R = new Vector3();
    let U = new Vector3();
    let miterScaleX = 1;

    if (i === 0) {
      const d = new Vector3().subVectors(points[1], points[0]);
      if (d.lengthSq() < 0.0001) d.set(0, 0, 1);
      d.normalize();
      
      R.crossVectors(d, new Vector3(0, 1, 0));
      if (R.lengthSq() < 0.0001) R.set(1, 0, 0);
      R.normalize();
      
      U.crossVectors(R, d);
      if (U.lengthSq() < 0.0001) U.set(0, 1, 0);
      U.normalize();
    } else if (i === points.length - 1) {
      const d = new Vector3().subVectors(points[i], points[i - 1]);
      if (d.lengthSq() < 0.0001) d.set(0, 0, 1);
      d.normalize();
      
      R.crossVectors(d, new Vector3(0, 1, 0));
      if (R.lengthSq() < 0.0001) R.set(1, 0, 0);
      R.normalize();
      
      U.crossVectors(R, d);
      if (U.lengthSq() < 0.0001) U.set(0, 1, 0);
      U.normalize();
    } else {
      const d1 = new Vector3().subVectors(points[i], points[i - 1]);
      if (d1.lengthSq() < 0.0001) d1.set(0, 0, 1);
      d1.normalize();
      
      const d2 = new Vector3().subVectors(points[i + 1], points[i]);
      if (d2.lengthSq() < 0.0001) d2.copy(d1);
      d2.normalize();
      
      const n = new Vector3().addVectors(d1, d2).normalize();

      if (n.lengthSq() < 0.001) {
        // Fallback for 180 degree turns or degenerate identical points
        R.crossVectors(d1, new Vector3(0, 1, 0));
        if (R.lengthSq() < 0.0001) R.set(1, 0, 0);
        R.normalize();
        
        U.crossVectors(R, d1);
        if (U.lengthSq() < 0.0001) U.set(0, 1, 0);
        U.normalize();
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

    pathData.push({ p: points[i], R, U, miterScaleX, pathDist });
  }

  return pathData;
}

/**
 * Creates a BufferGeometry by sweeping a 2D shape along a polyline path,
 * using miter joints at each interior vertex so adjacent segments meet cleanly.
 *
 * @param {import("three").Shape} shape - A Three.js Shape whose 2D points define the cross-section.
 * @param {Vector3[] | Array<{ p: Vector3, U: Vector3, R: Vector3, miterScaleX: number, pathDist: number }>} pointsOrPathData - Array of points or precalculated path data.
 * @returns {BufferGeometry} A non-indexed BufferGeometry ready for rendering, with a trivial index buffer to support Rapier.
 */
export function createMiterGeometry(shape, pointsOrPathData) {
  if (pointsOrPathData.length < 2) return new BufferGeometry();

  let pathData;
  if (pointsOrPathData[0] instanceof Vector3) {
    pathData = computeMiterPathData(pointsOrPathData);
  } else {
    pathData = pointsOrPathData;
  }

  const shapePoints = shape.getPoints();
  const vertexCount = shapePoints.length * pathData.length;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = [];

  for (let i = 0; i < pathData.length; i++) {
    const { p, U, R, miterScaleX, pathDist } = pathData[i];

    for (let j = 0; j < shapePoints.length; j++) {
      const sp = shapePoints[j];
      // Shape X maps to UP, Shape Y maps to RIGHT
      const pos = new Vector3()
        .copy(p)
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

  for (let i = 0; i < pathData.length - 1; i++) {
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
  const positionCount = nonIndexedGeo.attributes.position.count;
  const newIndices = new Uint32Array(positionCount);
  for (let i = 0; i < positionCount; i++) {
    newIndices[i] = i;
  }
  nonIndexedGeo.setIndex(new BufferAttribute(newIndices, 1));

  return nonIndexedGeo;
}

/**
 * Generates a Float32Array of vertices for a convex hull representing a swept 2D shape
 * along a single line segment, taking into account miter joints.
 *
 * @param {import("three").Shape} shape - The 2D cross-section shape
 * @param {Object} d0 - Segment start point data: { p: Vector3, U: Vector3, R: Vector3, miterScaleX: number }
 * @param {Object} d1 - Segment end point data: { p: Vector3, U: Vector3, R: Vector3, miterScaleX: number }
 * @returns {Float32Array} The vertices [x, y, z, x, y, z, ...] for the convex hull
 */
export function createSegmentHull(shape, d0, d1) {
  const sps = shape.getPoints();
  const verts = new Float32Array(sps.length * 2 * 3);

  let idx = 0;
  // Points for start of segment
  for (let j = 0; j < sps.length; j++) {
    const pos = d0.p
      .clone()
      .addScaledVector(d0.U, -sps[j].x)
      .addScaledVector(d0.R, -sps[j].y * d0.miterScaleX);
    verts[idx++] = pos.x;
    verts[idx++] = pos.y;
    verts[idx++] = pos.z;
  }
  // Points for end of segment
  for (let j = 0; j < sps.length; j++) {
    const pos = d1.p
      .clone()
      .addScaledVector(d1.U, -sps[j].x)
      .addScaledVector(d1.R, -sps[j].y * d1.miterScaleX);
    verts[idx++] = pos.x;
    verts[idx++] = pos.y;
    verts[idx++] = pos.z;
  }
  return verts;
}
