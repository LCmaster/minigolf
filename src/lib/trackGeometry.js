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

  let shapePoints = shape.getPoints();

  // Force all shapes to be Counter-Clockwise (CCW)
  // This guarantees our mathematical normal (-dy * U + dx * R) always points strictly outward.
  let area = 0;
  for (let j = 0; j < shapePoints.length; j++) {
    const p1 = shapePoints[j];
    const p2 = shapePoints[(j + 1) % shapePoints.length];
    area += (p2.x - p1.x) * (p2.y + p1.y);
  }
  if (area > 0) {
    // Area > 0 means Clockwise in standard 2D coords
    shapePoints = shapePoints.slice().reverse();
  }

  const numQuadsPath = pathData.length - 1;
  const numQuadsShape = shapePoints.length - 1;
  const vertexCount = numQuadsPath * numQuadsShape * 6;

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  let offset = 0;

  for (let i = 0; i < numQuadsPath; i++) {
    const pd0 = pathData[i];
    const pd1 = pathData[i + 1];

    for (let j = 0; j < numQuadsShape; j++) {
      const sp0 = shapePoints[j];
      const sp1 = shapePoints[j + 1];

      let dx = sp1.x - sp0.x;
      let dy = sp1.y - sp0.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        dx /= len;
        dy /= len;
      }

      // Normal formula for CCW mapping: -dy * U + dx * R
      const n0 = new Vector3()
        .copy(pd0.U).multiplyScalar(-dy)
        .addScaledVector(pd0.R, dx)
        .normalize();

      const n1 = new Vector3()
        .copy(pd1.U).multiplyScalar(-dy)
        .addScaledVector(pd1.R, dx)
        .normalize();

      // Compute the 4 vertices of the quad
      const pA = new Vector3().copy(pd0.p).addScaledVector(pd0.U, -sp0.x).addScaledVector(pd0.R, -sp0.y * pd0.miterScaleX);
      const pB = new Vector3().copy(pd0.p).addScaledVector(pd0.U, -sp1.x).addScaledVector(pd0.R, -sp1.y * pd0.miterScaleX);
      const pC = new Vector3().copy(pd1.p).addScaledVector(pd1.U, -sp0.x).addScaledVector(pd1.R, -sp0.y * pd1.miterScaleX);
      const pD = new Vector3().copy(pd1.p).addScaledVector(pd1.U, -sp1.x).addScaledVector(pd1.R, -sp1.y * pd1.miterScaleX);

      const uvA_x = j / numQuadsShape;
      const uvB_x = (j + 1) / numQuadsShape;
      const uvA_y = pd0.pathDist;
      const uvC_y = pd1.pathDist;

      // Triangle 1: A, B, C
      positions.set([pA.x, pA.y, pA.z], offset * 3);
      normals.set([n0.x, n0.y, n0.z], offset * 3);
      uvs.set([uvA_x, uvA_y], offset * 2);
      offset++;

      positions.set([pB.x, pB.y, pB.z], offset * 3);
      normals.set([n0.x, n0.y, n0.z], offset * 3);
      uvs.set([uvB_x, uvA_y], offset * 2);
      offset++;

      positions.set([pC.x, pC.y, pC.z], offset * 3);
      normals.set([n1.x, n1.y, n1.z], offset * 3);
      uvs.set([uvA_x, uvC_y], offset * 2);
      offset++;

      // Triangle 2: C, B, D
      positions.set([pC.x, pC.y, pC.z], offset * 3);
      normals.set([n1.x, n1.y, n1.z], offset * 3);
      uvs.set([uvA_x, uvC_y], offset * 2);
      offset++;

      positions.set([pB.x, pB.y, pB.z], offset * 3);
      normals.set([n0.x, n0.y, n0.z], offset * 3);
      uvs.set([uvB_x, uvA_y], offset * 2);
      offset++;

      positions.set([pD.x, pD.y, pD.z], offset * 3);
      normals.set([n1.x, n1.y, n1.z], offset * 3);
      uvs.set([uvB_x, uvC_y], offset * 2);
      offset++;
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));

  // Rapier's trimesh collider builder strictly requires an index buffer
  const newIndices = new Uint32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    newIndices[i] = i;
  }
  geo.setIndex(new BufferAttribute(newIndices, 1));

  return geo;
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
