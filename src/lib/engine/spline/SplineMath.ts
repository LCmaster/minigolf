/**
 * SplineMath.ts
 * Legacy cubic Bezier utilities plus re-exports from PolylineMath.ts for backwards compatibility.
 */

import * as THREE from "three";
import type { SplineWaypoint } from "../types/CourseSchema";

export * from "./PolylineMath";

export const MIN_HANDLE_LENGTH = 0.5;
export const MAX_HANDLE_LENGTH = 14.0;
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
  const dir = new THREE.Vector2(nz, -nx);
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
        const cross = chord.x * dir.y - chord.y * dir.x;
        const sideSign = cross >= 0 ? 1 : -1;
        const maxAngle = (105 * Math.PI) / 180;
        const cosA = Math.cos(maxAngle);
        const sinA = Math.sin(maxAngle) * sideSign;
        dir
          .set(chord.x * cosA - chord.y * sinA, chord.x * sinA + chord.y * cosA)
          .normalize();
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

/**
 * Resolves 2D XZ cubic Bezier control points for legacy C1/C0 span curves.
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

  const t0 = Math.max(0, t - 0.02);
  const t1 = Math.min(1, t + 0.02);
  const a = evaluateCubicBezier2D(p0, p1, p2, p3, t0);
  const b = evaluateCubicBezier2D(p0, p1, p2, p3, t1);
  const chord = b.sub(a);
  if (chord.lengthSq() > 1e-8) return chord.normalize();

  const fallback = p3.clone().sub(p0);
  return fallback.lengthSq() > 1e-8 ? fallback.normalize() : new THREE.Vector2(0, -1);
}
