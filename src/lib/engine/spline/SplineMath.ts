/**
 * SplineMath.ts
 * Pure cubic Bezier & arc-length sampling math for single-handle C1/C0 track splines.
 */

import * as THREE from "three";
import type { SplinePathData, SplineWaypoint } from "../types/CourseSchema";

export const ELEVATION_STEP_METERS = 1.5;
export const MIN_HANDLE_LENGTH = 0.5;
export const MAX_HANDLE_LENGTH = 14.0;
export type GridSnapSize = 0 | 1 | 3 | 6;

/**
 * Origin-aligned coordinate snap (`Math.round(v / step) * step`), keeping (0, 0)
 * on exact grid intersections so modular 3m/6m/12m tiles align seamlessly.
 */
export function snapCoordinateToGrid(value: number, step: number): number {
  if (!Number.isFinite(step) || step <= 0) return value;
  const snapped = Math.round(value / step) * step;
  return snapped === 0 ? 0 : snapped; // Avoid -0
}

export function snapPointXZToGrid(point: THREE.Vector3, step: number): THREE.Vector3 {
  if (!Number.isFinite(step) || step <= 0) return point.clone();
  return new THREE.Vector3(
    snapCoordinateToGrid(point.x, step),
    point.y,
    snapCoordinateToGrid(point.z, step)
  );
}

export function snapBevelRadiusToGrid(radius: number, step: number): number {
  if (!Number.isFinite(step) || step <= 0 || radius <= 0.15) return Math.max(0, radius);
  return Math.max(0, Math.round(radius));
}
const MAX_CHORD_STEER_DOT = Math.cos((105 * Math.PI) / 180); // ~ -0.2588 (±105° forward safety cone)

/**
 * Converts an outgoing C1 tangent offset (XZ) into a 90° right-hand perpendicular
 * handle arm offset (XZ) for display in the viewport.
 */
export function tangentToPerpHandleOffset(tx: number, tz: number): [number, number] {
  return [-tz, tx];
}

/**
 * Converts a dragged 90° right-hand perpendicular handle arm offset (XZ) back into a
 * symmetric outgoing C1 tangent offset, clamping length and preventing >105° reversals
 * relative to the neighbor chord [prevPos -> nextPos].
 */
export function perpHandleOffsetToTangent(
  nx: number,
  nz: number,
  prevPos?: [number, number, number],
  nextPos?: [number, number, number]
): [number, number] {
  const len = Math.hypot(nx, nz);
  const clampedLen = Math.max(MIN_HANDLE_LENGTH, Math.min(MAX_HANDLE_LENGTH, len || 2.4));

  // Inverse of (-tz, tx) is (nz, -nx)
  let dir = new THREE.Vector2(nz, -nx);
  if (dir.lengthSq() < 1e-8) {
    dir.set(0, -1);
  } else {
    dir.normalize();
  }

  if (prevPos && nextPos) {
    const chord = new THREE.Vector2(nextPos[0] - prevPos[0], nextPos[2] - prevPos[2]);
    if (chord.lengthSq() > 1e-6) {
      chord.normalize();
      const dot = dir.x * chord.x + dir.y * chord.y;
      if (dot < MAX_CHORD_STEER_DOT) {
        // Clamp onto ±105° cone around chord preserving which side of chord the tangent leaned toward
        const cross = chord.x * dir.y - chord.y * dir.x;
        const sideSign = cross >= 0 ? 1 : -1;
        const maxAngle = (105 * Math.PI) / 180;
        const cosA = Math.cos(maxAngle);
        const sinA = Math.sin(maxAngle) * sideSign;
        dir.set(
          chord.x * cosA - chord.y * sinA,
          chord.x * sinA + chord.y * cosA
        ).normalize();
      }
    }
  }

  return [dir.x * clampedLen, dir.y * clampedLen];
}

export interface SpanControlPoints {
  p0: THREE.Vector2;
  p1: THREE.Vector2;
  p2: THREE.Vector2;
  p3: THREE.Vector2;
}

export interface SplineSample {
  s: number;
  position: THREE.Vector3;
  tangentXZ: THREE.Vector2;
  spanIndex: number;
  t: number;
  targetElevationStep: number;
  isBevelArc?: boolean;
  isSharpCorner?: boolean;
}

export const MAX_BEVEL_RADIUS = 24.0;
export const BEVEL_HANDLE_BASE_OFFSET = 1.6;

export interface CornerBevelGeometry {
  isValidCorner: boolean;
  isBeveled: boolean;
  turnAngle: number; // Radians in [0, PI]
  trimDist: number;
  effectiveRadius: number;
  maxRadius: number;
  sagitta: number;
  bisectorXZ: THREE.Vector2;
  handlePosXZ: THREE.Vector2;
  entryXZ: THREE.Vector2;
  exitXZ: THREE.Vector2;
  arcCenterXZ: THREE.Vector2;
  arcMidXZ: THREE.Vector2;
  startAngle: number;
  dAngle: number;
}

/**
 * Computes exact 2D XZ circular fillet (bevel) geometry at an intermediate polyline vertex.
 * Returns bisector and maxRadius even when `requestedRadius === 0` (sharp corner).
 */
export function getCornerBevelGeometry(
  prevPos: [number, number, number],
  cornerPos: [number, number, number],
  nextPos: [number, number, number],
  requestedRadius: number = 0
): CornerBevelGeometry {
  const c = new THREE.Vector2(cornerPos[0], cornerPos[2]);
  const vIn = new THREE.Vector2(prevPos[0] - cornerPos[0], prevPos[2] - cornerPos[2]);
  const vOut = new THREE.Vector2(nextPos[0] - cornerPos[0], nextPos[2] - cornerPos[2]);

  const lenIn = vIn.length();
  const lenOut = vOut.length();
  if (lenIn < 1e-4 || lenOut < 1e-4) {
    return {
      isValidCorner: false,
      isBeveled: false,
      turnAngle: 0,
      trimDist: 0,
      effectiveRadius: 0,
      maxRadius: 0,
      sagitta: 0,
      bisectorXZ: new THREE.Vector2(1, 0),
      handlePosXZ: c.clone().add(new THREE.Vector2(BEVEL_HANDLE_BASE_OFFSET, 0)),
      entryXZ: c.clone(),
      exitXZ: c.clone(),
      arcCenterXZ: c.clone(),
      arcMidXZ: c.clone(),
      startAngle: 0,
      dAngle: 0,
    };
  }

  const uIn = vIn.clone().divideScalar(lenIn);
  const uOut = vOut.clone().divideScalar(lenOut);
  const dIn = uIn.clone().negate(); // Incoming forward tangent

  const cosTurn = THREE.MathUtils.clamp(dIn.dot(uOut), -1, 1);
  const turnAngle = Math.acos(cosTurn);

  // Inside-corner bisector; if collinear (180° straight), pick right-hand normal to dIn
  let bisector = uIn.clone().add(uOut);
  if (bisector.lengthSq() < 1e-6) {
    bisector.set(-dIn.y, dIn.x);
  }
  bisector.normalize();

  if (turnAngle < 0.03 || turnAngle > Math.PI - 0.03) {
    return {
      isValidCorner: turnAngle >= 0.03,
      isBeveled: false,
      turnAngle,
      trimDist: 0,
      effectiveRadius: 0,
      maxRadius: 0,
      sagitta: 0,
      bisectorXZ: bisector,
      handlePosXZ: c.clone().addScaledVector(bisector, BEVEL_HANDLE_BASE_OFFSET),
      entryXZ: c.clone(),
      exitXZ: c.clone(),
      arcCenterXZ: c.clone(),
      arcMidXZ: c.clone(),
      startAngle: 0,
      dAngle: 0,
    };
  }

  const tanHalf = Math.tan(turnAngle * 0.5);
  const maxTrim = 0.45 * Math.min(lenIn, lenOut);
  const maxRadius = Math.min(MAX_BEVEL_RADIUS, tanHalf > 1e-4 ? maxTrim / tanHalf : 0);

  const clampedRadius = Math.max(0, Math.min(maxRadius, requestedRadius || 0));
  if (clampedRadius <= 0.15) {
    return {
      isValidCorner: true,
      isBeveled: false,
      turnAngle,
      trimDist: 0,
      effectiveRadius: 0,
      maxRadius,
      sagitta: 0,
      bisectorXZ: bisector,
      handlePosXZ: c.clone().addScaledVector(bisector, BEVEL_HANDLE_BASE_OFFSET),
      entryXZ: c.clone(),
      exitXZ: c.clone(),
      arcCenterXZ: c.clone(),
      arcMidXZ: c.clone(),
      startAngle: 0,
      dAngle: 0,
    };
  }

  const trimDist = clampedRadius * tanHalf;
  const entryXZ = c.clone().addScaledVector(uIn, trimDist);
  const exitXZ = c.clone().addScaledVector(uOut, trimDist);
  const centerDist = Math.hypot(clampedRadius, trimDist);
  const sagitta = centerDist - clampedRadius;
  const arcCenterXZ = c.clone().addScaledVector(bisector, centerDist);
  const arcMidXZ = arcCenterXZ.clone().addScaledVector(bisector, -clampedRadius);

  const startAngle = Math.atan2(entryXZ.y - arcCenterXZ.y, entryXZ.x - arcCenterXZ.x);
  const endAngle = Math.atan2(exitXZ.y - arcCenterXZ.y, exitXZ.x - arcCenterXZ.x);
  let dAngle = endAngle - startAngle;
  while (dAngle <= -Math.PI) dAngle += Math.PI * 2;
  while (dAngle > Math.PI) dAngle -= Math.PI * 2;

  return {
    isValidCorner: true,
    isBeveled: true,
    turnAngle,
    trimDist,
    effectiveRadius: clampedRadius,
    maxRadius,
    sagitta,
    bisectorXZ: bisector,
    handlePosXZ: c.clone().addScaledVector(bisector, BEVEL_HANDLE_BASE_OFFSET + sagitta),
    entryXZ,
    exitXZ,
    arcCenterXZ,
    arcMidXZ,
    startAngle,
    dAngle,
  };
}

/**
 * Converts a dragged world XZ handle position along the corner's inside bisector
 * into a clamped bevel radius (0 = sharp corner).
 */
export function bisectorBevelDragToRadius(
  prevPos: [number, number, number],
  cornerPos: [number, number, number],
  nextPos: [number, number, number],
  dragWorldXZ: [number, number]
): number {
  const geom = getCornerBevelGeometry(prevPos, cornerPos, nextPos, 0);
  if (!geom.isValidCorner || geom.maxRadius <= 0) return 0;

  const dx = dragWorldXZ[0] - cornerPos[0];
  const dz = dragWorldXZ[1] - cornerPos[2];
  const projDist = dx * geom.bisectorXZ.x + dz * geom.bisectorXZ.y;
  const sagitta = projDist - BEVEL_HANDLE_BASE_OFFSET;
  if (sagitta <= 0.12) return 0;

  const secMinusOne = 1 / Math.cos(geom.turnAngle * 0.5) - 1;
  if (secMinusOne <= 1e-5) return 0;
  const radius = sagitta / secMinusOne;
  return THREE.MathUtils.clamp(radius, 0, geom.maxRadius);
}

export function cloneSplineWaypoints(nodes: SplineWaypoint[]): SplineWaypoint[] {
  return nodes.map((n) => ({
    ...n,
    position: [...n.position] as [number, number, number],
    handleOffset: [...n.handleOffset] as [number, number],
  }));
}

export function cloneSplinePath(path: SplinePathData): SplinePathData {
  return {
    closed: false,
    nodes: cloneSplineWaypoints(path.nodes),
  };
}

export function getElevationStep(node: SplineWaypoint): number {
  if (typeof node.elevationStep === "number") return Math.round(node.elevationStep);
  return Math.round((node.position[1] || 0) / ELEVATION_STEP_METERS);
}

/**
 * Resolves 2D XZ cubic Bezier control points for span [a -> b].
 * A single outgoing `handleOffset` on each node mirrors `-handleOffset` for incoming
 * to enforce C1 continuity unless `corner === true` (C0 vertex).
 * When `relaxedEnd` is true (terminal Cup span), `p2` smoothly aligns from `p1` to `p3`
 * so the Cup arrives cleanly without a manual end handle.
 */
export function resolveSpanControlPoints(
  a: SplineWaypoint,
  b: SplineWaypoint,
  options?: { relaxedEnd?: boolean }
): SpanControlPoints {
  const p0 = new THREE.Vector2(a.position[0], a.position[2]);
  const p3 = new THREE.Vector2(b.position[0], b.position[2]);

  const outTangent = a.corner
    ? new THREE.Vector2(0, 0)
    : new THREE.Vector2(a.handleOffset[0], a.handleOffset[1]);

  const p1 = p0.clone().add(outTangent);

  let p2: THREE.Vector2;
  if (b.corner) {
    p2 = p3.clone();
  } else if (options?.relaxedEnd) {
    p2 = p1.clone().lerp(p3, 2 / 3);
  } else {
    const inTangent = new THREE.Vector2(-b.handleOffset[0], -b.handleOffset[1]);
    p2 = p3.clone().add(inTangent);
  }

  return { p0, p1, p2, p3 };
}

export function evaluateCubicBezier2D(
  p0: THREE.Vector2,
  p1: THREE.Vector2,
  p2: THREE.Vector2,
  p3: THREE.Vector2,
  t: number
): THREE.Vector2 {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return new THREE.Vector2(
    uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  );
}

export function evaluateCubicBezierTangent2D(
  p0: THREE.Vector2,
  p1: THREE.Vector2,
  p2: THREE.Vector2,
  p3: THREE.Vector2,
  t: number
): THREE.Vector2 {
  const u = 1 - t;
  const d = new THREE.Vector2(
    3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y)
  );

  if (d.lengthSq() > 1e-6) {
    return d.normalize();
  }

  // Fallback for zero-handle corner endpoints
  const t0 = Math.max(0, t - 0.02);
  const t1 = Math.min(1, t + 0.02);
  const a = evaluateCubicBezier2D(p0, p1, p2, p3, t0);
  const b = evaluateCubicBezier2D(p0, p1, p2, p3, t1);
  const chord = b.sub(a);
  if (chord.lengthSq() > 1e-8) return chord.normalize();

  const fallback = p3.clone().sub(p0);
  return fallback.lengthSq() > 1e-8 ? fallback.normalize() : new THREE.Vector2(0, -1);
}

/**
 * Samples the ordered waypoint polyline with circular corner bevels into cumulative arc-length samples.
 * Straight legs run linearly between corner entry/exit points; corners are either sharp turns
 * or smooth circular bevel arcs when `node.bevelRadius > 0`.
 */
export function sampleSplineChain(
  nodes: SplineWaypoint[],
  samplesPerSpan: number = 24
): SplineSample[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) {
    const n = nodes[0];
    const tan = new THREE.Vector2(n.handleOffset[0], n.handleOffset[1]);
    if (tan.lengthSq() < 1e-6) tan.set(0, -1);
    else tan.normalize();
    return [
      {
        s: 0,
        position: new THREE.Vector3(n.position[0], n.position[1], n.position[2]),
        tangentXZ: tan,
        spanIndex: 0,
        t: 0,
        targetElevationStep: getElevationStep(n),
      },
    ];
  }

  // Precompute bevel geometry for every intermediate corner
  const corners: Array<CornerBevelGeometry | null> = nodes.map((node, i) => {
    if (i === 0 || i === nodes.length - 1) return null;
    const reqRadius = node.corner ? 0 : node.bevelRadius ?? 0;
    return getCornerBevelGeometry(
      nodes[i - 1].position,
      node.position,
      nodes[i + 1].position,
      reqRadius
    );
  });

  const samples: SplineSample[] = [];
  let cumulativeS = 0;
  let prevSamplePos: THREE.Vector3 | null = null;

  const pushSample = (
    pos: THREE.Vector3,
    tangentXZ: THREE.Vector2,
    spanIndex: number,
    t: number,
    targetElevationStep: number,
    flags?: { isBevelArc?: boolean; isSharpCorner?: boolean }
  ) => {
    if (prevSamplePos) {
      cumulativeS += pos.distanceTo(prevSamplePos);
    }
    prevSamplePos = pos;
    samples.push({
      s: cumulativeS,
      position: pos,
      tangentXZ: tangentXZ.clone(),
      spanIndex,
      t,
      targetElevationStep,
      ...flags,
    });
  };

  for (let span = 0; span < nodes.length - 1; span++) {
    const a = nodes[span];
    const b = nodes[span + 1];
    const bevelA = corners[span];
    const bevelB = corners[span + 1];

    const stepA = getElevationStep(a);
    const stepB = getElevationStep(b);

    const pA2 = new THREE.Vector2(a.position[0], a.position[2]);
    const pB2 = new THREE.Vector2(b.position[0], b.position[2]);
    const legVec = pB2.clone().sub(pA2);
    const legLen = legVec.length();
    const legTan = legLen > 1e-6 ? legVec.clone().divideScalar(legLen) : new THREE.Vector2(0, -1);

    const startTrim = bevelA?.isBeveled ? bevelA.trimDist : 0;
    const endTrim = bevelB?.isBeveled ? bevelB.trimDist : 0;

    const startXZ = bevelA?.isBeveled ? bevelA.exitXZ.clone() : pA2.clone();
    const endXZ = bevelB?.isBeveled ? bevelB.entryXZ.clone() : pB2.clone();
    const yStart = legLen > 1e-6 ? THREE.MathUtils.lerp(a.position[1], b.position[1], startTrim / legLen) : a.position[1];
    const yEnd = legLen > 1e-6 ? THREE.MathUtils.lerp(a.position[1], b.position[1], 1 - endTrim / legLen) : b.position[1];

    const startIdx = span === 0 ? 0 : 1;
    const stepsOnLeg = Math.max(2, samplesPerSpan);
    for (let i = startIdx; i <= stepsOnLeg; i++) {
      const t = i / stepsOnLeg;
      const pt = startXZ.clone().lerp(endXZ, t);
      const y = THREE.MathUtils.lerp(yStart, yEnd, t);
      const fracGlobal =
        legLen > 1e-6 ? (startTrim + t * Math.max(0, legLen - startTrim - endTrim)) / legLen : t;
      const isSharpAtEnd = Boolean(bevelB && !bevelB.isBeveled && i === stepsOnLeg);

      pushSample(
        new THREE.Vector3(pt.x, y, pt.y),
        legTan,
        span,
        t,
        fracGlobal >= 0.5 ? stepB : stepA,
        isSharpAtEnd ? { isSharpCorner: true } : undefined
      );
    }

    // Sample beveled corner arc right after leg [span] ends at entry_B
    if (bevelB && bevelB.isBeveled && span + 1 < nodes.length - 1) {
      const c = nodes[span + 1];
      const next = nodes[span + 2];
      const lenNext = Math.hypot(next.position[0] - c.position[0], next.position[2] - c.position[2]);
      const yArcEnd =
        lenNext > 1e-6
          ? THREE.MathUtils.lerp(c.position[1], next.position[1], bevelB.trimDist / lenNext)
          : c.position[1];

      const arcSteps = Math.max(6, Math.round(samplesPerSpan * 0.6));
      for (let j = 1; j <= arcSteps; j++) {
        const u = j / arcSteps;
        const ang = bevelB.startAngle + bevelB.dAngle * u;
        const px = bevelB.arcCenterXZ.x + Math.cos(ang) * bevelB.effectiveRadius;
        const pz = bevelB.arcCenterXZ.y + Math.sin(ang) * bevelB.effectiveRadius;
        const py = THREE.MathUtils.lerp(yEnd, yArcEnd, u);

        const dirSign = bevelB.dAngle >= 0 ? 1 : -1;
        const tan = new THREE.Vector2(-Math.sin(ang) * dirSign, Math.cos(ang) * dirSign).normalize();
        pushSample(new THREE.Vector3(px, py, pz), tan, span + 1, u, getElevationStep(c), {
          isBevelArc: true,
        });
      }
    }
  }

  return samples;
}

export function getSampleAtArcLength(samples: SplineSample[], s: number): SplineSample | null {
  if (samples.length === 0) return null;
  if (s <= 0 || samples.length === 1) return samples[0];
  const last = samples[samples.length - 1];
  if (s >= last.s) return last;

  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    if (s >= a.s && s <= b.s) {
      const span = b.s - a.s;
      const alpha = span > 1e-6 ? (s - a.s) / span : 0;
      const tan = a.tangentXZ.clone().lerp(b.tangentXZ, alpha);
      if (tan.lengthSq() > 1e-6) tan.normalize();
      else tan.copy(a.tangentXZ);
      return {
        s,
        position: a.position.clone().lerp(b.position, alpha),
        tangentXZ: tan,
        spanIndex: alpha < 0.5 ? a.spanIndex : b.spanIndex,
        t: THREE.MathUtils.lerp(a.t, b.t, alpha),
        targetElevationStep: alpha >= 0.5 ? b.targetElevationStep : a.targetElevationStep,
      };
    }
  }
  return last;
}

/**
 * Projects a world XZ coordinate onto the nearest point on the sampled spline chain,
 * optionally restricting search to arc-lengths >= minS.
 */
export function projectPointOntoSpline(
  samples: SplineSample[],
  pointXZ: THREE.Vector2,
  minS: number = 0
): SplineSample | null {
  if (samples.length === 0) return null;

  let best: SplineSample | null = null;
  let bestDistSq = Infinity;

  for (let i = 0; i < samples.length; i++) {
    const smp = samples[i];
    if (smp.s < minS) continue;
    const dx = smp.position.x - pointXZ.x;
    const dz = smp.position.z - pointXZ.y;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestDistSq) {
      bestDistSq = d2;
      best = smp;
    }
  }

  return best ?? samples[samples.length - 1];
}

