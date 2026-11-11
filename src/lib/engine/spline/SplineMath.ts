/**
 * SplineMath.ts
 * Pure cubic Bezier & arc-length sampling math for single-handle C1/C0 track splines.
 */

import * as THREE from "three";
import type { SplinePathData, SplineWaypoint } from "../types/CourseSchema";

export const ELEVATION_STEP_METERS = 1.5;

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
 */
export function resolveSpanControlPoints(a: SplineWaypoint, b: SplineWaypoint): SpanControlPoints {
  const p0 = new THREE.Vector2(a.position[0], a.position[2]);
  const p3 = new THREE.Vector2(b.position[0], b.position[2]);

  const outTangent = a.corner
    ? new THREE.Vector2(0, 0)
    : new THREE.Vector2(a.handleOffset[0], a.handleOffset[1]);

  const inTangent = b.corner
    ? new THREE.Vector2(0, 0)
    : new THREE.Vector2(-b.handleOffset[0], -b.handleOffset[1]);

  const p1 = p0.clone().add(outTangent);
  const p2 = p3.clone().add(inTangent);

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
 * Samples the ordered spline node chain into cumulative arc-length lookup samples.
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

  const samples: SplineSample[] = [];
  let cumulativeS = 0;
  let prevPos: THREE.Vector3 | null = null;

  for (let span = 0; span < nodes.length - 1; span++) {
    const a = nodes[span];
    const b = nodes[span + 1];
    const ctrl = resolveSpanControlPoints(a, b);
    const stepA = getElevationStep(a);
    const stepB = getElevationStep(b);

    const startIdx = span === 0 ? 0 : 1;
    for (let i = startIdx; i <= samplesPerSpan; i++) {
      const t = i / samplesPerSpan;
      const ptXZ = evaluateCubicBezier2D(ctrl.p0, ctrl.p1, ctrl.p2, ctrl.p3, t);
      const tanXZ = evaluateCubicBezierTangent2D(ctrl.p0, ctrl.p1, ctrl.p2, ctrl.p3, t);
      const y = THREE.MathUtils.lerp(a.position[1], b.position[1], t);
      const pos = new THREE.Vector3(ptXZ.x, y, ptXZ.y);

      if (prevPos) {
        cumulativeS += pos.distanceTo(prevPos);
      }
      prevPos = pos;

      samples.push({
        s: cumulativeS,
        position: pos,
        tangentXZ: tanXZ,
        spanIndex: span,
        t,
        targetElevationStep: t >= 0.5 ? stepB : stepA,
      });
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
