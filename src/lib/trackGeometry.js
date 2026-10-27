import { Vector3, Float32BufferAttribute, BufferAttribute, BufferGeometry } from "three";

/**
 * Expands control points into a refined polyline where interior points with
 * `shape === "rounded"` are smoothly filleted using a quadratic Bezier arc,
 * while points with `shape === "sharp"` (default) remain crisp miter corners.
 *
 * @param {Vector3[]} points
 * @param {Array<{ shape?: string, cornerRadius?: number, width?: number, bankAngle?: number, leftWall?: boolean, rightWall?: boolean }>} [controlPoints]
 * @returns {Array<{ pos: Vector3, width: number, bankAngle: number, leftWall: boolean, rightWall: boolean, controlIndex: number | null }>}
 */
export function expandControlPoints(points, controlPoints = null) {
  if (!points || points.length === 0) return [];
  if (points.length === 1) {
    return [
      {
        pos: points[0].clone(),
        width: controlPoints?.[0]?.width ?? 2.5,
        bankAngle: controlPoints?.[0]?.bankAngle ?? 0,
        leftWall: controlPoints?.[0]?.leftWall !== false,
        rightWall: controlPoints?.[0]?.rightWall !== false,
        controlIndex: 0,
      },
    ];
  }

  const expanded = [];
  const n = points.length;

  // Start point
  expanded.push({
    pos: points[0].clone(),
    width: controlPoints?.[0]?.width ?? 2.5,
    bankAngle: controlPoints?.[0]?.bankAngle ?? 0,
    leftWall: controlPoints?.[0]?.leftWall !== false,
    rightWall: controlPoints?.[0]?.rightWall !== false,
    controlIndex: 0,
  });

  // Interior points
  for (let i = 1; i < n - 1; i++) {
    const cp = controlPoints?.[i];
    const wCurr = cp?.width ?? 2.5;
    const bCurr = cp?.bankAngle ?? 0;
    const lwCurr = cp?.leftWall !== false;
    const rwCurr = cp?.rightWall !== false;
    const isRounded = cp?.shape === "rounded";

    if (!isRounded) {
      expanded.push({
        pos: points[i].clone(),
        width: wCurr,
        bankAngle: bCurr,
        leftWall: lwCurr,
        rightWall: rwCurr,
        controlIndex: i,
      });
      continue;
    }

    const pPrev = points[i - 1];
    const pCurr = points[i];
    const pNext = points[i + 1];

    const vIn = new Vector3().subVectors(pPrev, pCurr);
    const vOut = new Vector3().subVectors(pNext, pCurr);
    const lenIn = vIn.length();
    const lenOut = vOut.length();

    const desiredRadius = cp?.cornerRadius ?? 4.0;
    const r = Math.min(desiredRadius, lenIn * 0.45, lenOut * 0.45);

    if (r <= 0.25) {
      expanded.push({
        pos: pCurr.clone(),
        width: wCurr,
        bankAngle: bCurr,
        leftWall: lwCurr,
        rightWall: rwCurr,
        controlIndex: i,
      });
      continue;
    }

    vIn.normalize();
    vOut.normalize();

    const A = pCurr.clone().addScaledVector(vIn, r);
    const B = pCurr;
    const C = pCurr.clone().addScaledVector(vOut, r);

    const wPrev = controlPoints?.[i - 1]?.width ?? 2.5;
    const wNext = controlPoints?.[i + 1]?.width ?? 2.5;
    const tIn = r / Math.max(0.001, lenIn);
    const tOut = r / Math.max(0.001, lenOut);
    const wStart = wCurr + (wPrev - wCurr) * tIn;
    const wEnd = wCurr + (wNext - wCurr) * tOut;

    const steps = 8; // Even number so s === steps / 2 is the exact apex
    const midStep = steps / 2;

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const oneMinusT = 1 - t;

      // Quadratic Bezier: (1 - t)^2 * A + 2(1 - t)t * B + t^2 * C
      const pos = new Vector3()
        .copy(A)
        .multiplyScalar(oneMinusT * oneMinusT)
        .addScaledVector(B, 2 * oneMinusT * t)
        .addScaledVector(C, t * t);

      const width =
        oneMinusT * oneMinusT * wStart +
        2 * oneMinusT * t * wCurr +
        t * t * wEnd;

      expanded.push({
        pos,
        width,
        bankAngle: bCurr,
        leftWall: lwCurr,
        rightWall: rwCurr,
        controlIndex: s === midStep ? i : null,
      });
    }
  }

  // End point
  const lastIdx = n - 1;
  expanded.push({
    pos: points[lastIdx].clone(),
    width: controlPoints?.[lastIdx]?.width ?? 2.5,
    bankAngle: controlPoints?.[lastIdx]?.bankAngle ?? 0,
    leftWall: controlPoints?.[lastIdx]?.leftWall !== false,
    rightWall: controlPoints?.[lastIdx]?.rightWall !== false,
    controlIndex: lastIdx,
  });

  return expanded;
}

/**
 * Computes coordinate frames (position, up, right, miterScaleX, halfWidth, wall flags, and path distance)
 * at each point of a polyline path to support miter joint sweeps.
 *
 * @param {Vector3[]} points - Array of Vector3 points representing the track spine.
 * @param {Array<{ shape?: string, cornerRadius?: number, width?: number, bankAngle?: number, leftWall?: boolean, rightWall?: boolean }>} [controlPoints]
 * @returns {Array<{ p: Vector3, U: Vector3, R: Vector3, miterScaleX: number, halfWidth: number, leftWall: boolean, rightWall: boolean, pathDist: number, controlIndex: number | null }>}
 */
export function computeMiterPathData(points, controlPoints = null) {
  if (!points || points.length < 2) return [];

  const expanded = expandControlPoints(points, controlPoints);
  const pathData = [];
  let pathDist = 0;

  for (let i = 0; i < expanded.length; i++) {
    const currPt = expanded[i].pos;
    if (i > 0) {
      pathDist += currPt.distanceTo(expanded[i - 1].pos);
    }

    let R = new Vector3();
    let U = new Vector3();
    let miterScaleX = 1;

    if (i === 0) {
      const d = new Vector3().subVectors(expanded[1].pos, currPt);
      if (d.lengthSq() < 0.0001) d.set(0, 0, 1);
      d.normalize();

      R.crossVectors(d, new Vector3(0, 1, 0));
      if (R.lengthSq() < 0.0001) R.set(1, 0, 0);
      R.normalize();

      U.crossVectors(R, d);
      if (U.lengthSq() < 0.0001) U.set(0, 1, 0);
      U.normalize();
    } else if (i === expanded.length - 1) {
      const d = new Vector3().subVectors(currPt, expanded[i - 1].pos);
      if (d.lengthSq() < 0.0001) d.set(0, 0, 1);
      d.normalize();

      R.crossVectors(d, new Vector3(0, 1, 0));
      if (R.lengthSq() < 0.0001) R.set(1, 0, 0);
      R.normalize();

      U.crossVectors(R, d);
      if (U.lengthSq() < 0.0001) U.set(0, 1, 0);
      U.normalize();
    } else {
      const d1 = new Vector3().subVectors(currPt, expanded[i - 1].pos);
      if (d1.lengthSq() < 0.0001) d1.set(0, 0, 1);
      d1.normalize();

      const d2 = new Vector3().subVectors(expanded[i + 1].pos, currPt);
      if (d2.lengthSq() < 0.0001) d2.copy(d1);
      d2.normalize();

      const n = new Vector3().addVectors(d1, d2).normalize();

      if (n.lengthSq() < 0.001) {
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

    const halfWidth = expanded[i].width ?? 2.5;
    const bankDeg = expanded[i].bankAngle ?? 0;
    const bankRad = (bankDeg * Math.PI) / 180;

    if (Math.abs(bankRad) > 0.0001) {
      const cosB = Math.cos(bankRad);
      const sinB = Math.sin(bankRad);
      const bankedR = R.clone().multiplyScalar(cosB).addScaledVector(U, sinB);
      const bankedU = U.clone().multiplyScalar(cosB).addScaledVector(R, -sinB);
      R.copy(bankedR).normalize();
      U.copy(bankedU).normalize();
    }

    pathData.push({
      p: currPt,
      R,
      U,
      miterScaleX,
      halfWidth,
      leftWall: expanded[i].leftWall !== false,
      rightWall: expanded[i].rightWall !== false,
      pathDist,
      controlIndex: expanded[i].controlIndex,
    });
  }

  return pathData;
}

function adjustShapeY(rawY, halfWidth = 2.5, hasLeftWall = true, hasRightWall = true) {
  if (Math.abs(rawY) < 0.0001) return 0;
  let y = rawY;
  // If a wall is disabled, trim the base foundation's outer 0.5m lip so it matches the tile edge
  if (!hasLeftWall && y > 2.51) y = 2.5;
  if (!hasRightWall && y < -2.51) y = -2.5;
  return y + Math.sign(y) * (halfWidth - 2.5);
}

/**
 * Creates a BufferGeometry by sweeping a 2D shape along a polyline path,
 * using miter joints at each interior vertex so adjacent segments meet cleanly.
 *
 * @param {import("three").Shape} shape - A Three.js Shape whose 2D points define the cross-section.
 * @param {Vector3[] | Array} pointsOrPathData
 * @param {{ wallSide?: 'left' | 'right' | 'base' | null }} [options]
 * @returns {BufferGeometry}
 */
export function createMiterGeometry(shape, pointsOrPathData, options = {}) {
  if (pointsOrPathData.length < 2) return new BufferGeometry();

  let pathData;
  if (pointsOrPathData[0] instanceof Vector3) {
    pathData = computeMiterPathData(pointsOrPathData);
  } else {
    pathData = pointsOrPathData;
  }

  const wallSide = options?.wallSide || null;

  let shapePoints = shape.getPoints();

  // Force all shapes to be Counter-Clockwise (CCW)
  let area = 0;
  for (let j = 0; j < shapePoints.length; j++) {
    const p1 = shapePoints[j];
    const p2 = shapePoints[(j + 1) % shapePoints.length];
    area += (p2.x - p1.x) * (p2.y + p1.y);
  }
  if (area > 0) {
    shapePoints = shapePoints.slice().reverse();
  }

  const numQuadsPath = pathData.length - 1;
  const numQuadsShape = shapePoints.length - 1;

  // Count active path segments first (some segments may have leftWall or rightWall disabled)
  let activeSegments = 0;
  for (let i = 0; i < numQuadsPath; i++) {
    const pd0 = pathData[i];
    if (wallSide === "left" && pd0.leftWall === false) continue;
    if (wallSide === "right" && pd0.rightWall === false) continue;
    activeSegments++;
  }

  const vertexCount = activeSegments * numQuadsShape * 6;
  if (vertexCount === 0) {
    return new BufferGeometry();
  }

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);

  let offset = 0;

  for (let i = 0; i < numQuadsPath; i++) {
    const pd0 = pathData[i];
    const pd1 = pathData[i + 1];

    const segLeftWall = pd0.leftWall !== false;
    const segRightWall = pd0.rightWall !== false;

    if (wallSide === "left" && !segLeftWall) continue;
    if (wallSide === "right" && !segRightWall) continue;

    const hw0 = pd0.halfWidth ?? 2.5;
    const hw1 = pd1.halfWidth ?? 2.5;

    const trimLeft = wallSide === "base" ? segLeftWall : true;
    const trimRight = wallSide === "base" ? segRightWall : true;

    for (let j = 0; j < numQuadsShape; j++) {
      const sp0 = shapePoints[j];
      const sp1 = shapePoints[j + 1];

      const y0_0 = adjustShapeY(sp0.y, hw0, trimLeft, trimRight);
      const y0_1 = adjustShapeY(sp1.y, hw0, trimLeft, trimRight);
      const y1_0 = adjustShapeY(sp0.y, hw1, trimLeft, trimRight);
      const y1_1 = adjustShapeY(sp1.y, hw1, trimLeft, trimRight);

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
      const pA = new Vector3().copy(pd0.p).addScaledVector(pd0.U, -sp0.x).addScaledVector(pd0.R, -y0_0 * pd0.miterScaleX);
      const pB = new Vector3().copy(pd0.p).addScaledVector(pd0.U, -sp1.x).addScaledVector(pd0.R, -y0_1 * pd0.miterScaleX);
      const pC = new Vector3().copy(pd1.p).addScaledVector(pd1.U, -sp0.x).addScaledVector(pd1.R, -y1_0 * pd1.miterScaleX);
      const pD = new Vector3().copy(pd1.p).addScaledVector(pd1.U, -sp1.x).addScaledVector(pd1.R, -y1_1 * pd1.miterScaleX);

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

  const newIndices = new Uint32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    newIndices[i] = i;
  }
  geo.setIndex(new BufferAttribute(newIndices, 1));

  return geo;
}

/**
 * Generates a Float32Array of vertices for a convex hull representing a swept 2D shape
 * along a single line segment, taking into account miter joints, width, and bankAngle.
 *
 * @param {import("three").Shape} shape - The 2D cross-section shape
 * @param {Object} d0 - Segment start point data
 * @param {Object} d1 - Segment end point data
 * @returns {Float32Array}
 */
export function createSegmentHull(shape, d0, d1) {
  const sps = shape.getPoints();
  const verts = new Float32Array(sps.length * 2 * 3);
  const hw0 = d0.halfWidth ?? 2.5;
  const hw1 = d1.halfWidth ?? 2.5;

  let idx = 0;
  for (let j = 0; j < sps.length; j++) {
    const y0 = adjustShapeY(sps[j].y, hw0);
    const pos = d0.p
      .clone()
      .addScaledVector(d0.U, -sps[j].x)
      .addScaledVector(d0.R, -y0 * d0.miterScaleX);
    verts[idx++] = pos.x;
    verts[idx++] = pos.y;
    verts[idx++] = pos.z;
  }
  for (let j = 0; j < sps.length; j++) {
    const y1 = adjustShapeY(sps[j].y, hw1);
    const pos = d1.p
      .clone()
      .addScaledVector(d1.U, -sps[j].x)
      .addScaledVector(d1.R, -y1 * d1.miterScaleX);
    verts[idx++] = pos.x;
    verts[idx++] = pos.y;
    verts[idx++] = pos.z;
  }
  return verts;
}