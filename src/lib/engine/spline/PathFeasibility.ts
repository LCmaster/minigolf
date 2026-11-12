import * as THREE from "three";
import type { SplineWaypoint } from "../types/CourseSchema";
import { getElevationStep } from "./PolylineMath";
import type { KitCandidatePiece } from "./KitVocabulary";

/** Maximum straight-segment perpendicular / position error (in meters) before marking unreachable. */
export const MAX_VALID_POS_ERROR_M = 2.05;

/** Relaxed positional tolerance (in meters) while sweeping around a corner pivot or bevel arc. */
export const MAX_VALID_CORNER_POS_ERROR_M = 2.45;

/** Maximum allowed heading divergence (in degrees) outside corner sweeps. */
export const MAX_VALID_HEADING_ERROR_DEG = 12.5;

/** Maximum allowed longitudinal distance error (in meters) from realized end to target terminal waypoint. */
export const MAX_VALID_END_LONGITUDINAL_ERROR_M = 3.15;

/** Arc-length window (in meters) around a corner/bevel considered inside a turn transition. */
export const CORNER_PROXIMITY_METERS = 3.6;

export interface FeasibilityStepSummary {
  kind: KitCandidatePiece["kind"];
  posErr: number;
  headingDeg: number;
  projS: number;
}

export interface FeasibilitySampleSummary {
  s: number;
  isSharpCorner?: boolean;
  isBevelArc?: boolean;
}

/**
 * Verifies every consecutive waypoint span with an elevation step delta has enough horizontal run
 * distance (`stepDiff * 6m - 1.5m`) to fit the required 15° ramps.
 */
export function hasValidElevationRampRoom(prefixNodes: SplineWaypoint[]): boolean {
  for (let span = 0; span < prefixNodes.length - 1; span++) {
    const stepDiff = Math.abs(
      getElevationStep(prefixNodes[span + 1]) - getElevationStep(prefixNodes[span])
    );
    const segHorizLen = Math.hypot(
      prefixNodes[span + 1].position[0] - prefixNodes[span].position[0],
      prefixNodes[span + 1].position[2] - prefixNodes[span].position[2]
    );
    if (stepDiff > 0 && segHorizLen + 1.5 < stepDiff * 6.0) {
      return false;
    }
  }
  return true;
}

/**
 * Checks whether all fitted beam steps stay within lateral position and heading tolerances,
 * permitting natural geometric sweep near turns and bevel arcs.
 */
export function isStepTrackingWithinTolerance(
  steps: FeasibilityStepSummary[],
  cornerArcLocations: number[]
): boolean {
  const isNearCorner = (sVal: number): boolean =>
    cornerArcLocations.some((cs) => Math.abs(cs - sVal) <= CORNER_PROXIMITY_METERS);

  for (let si = 0; si < steps.length; si++) {
    const st = steps[si];
    const nearCorner = st.kind === "turn" || isNearCorner(st.projS);
    if (st.posErr > (nearCorner ? MAX_VALID_CORNER_POS_ERROR_M : MAX_VALID_POS_ERROR_M)) {
      return false;
    }
    if (!nearCorner && st.headingDeg > MAX_VALID_HEADING_ERROR_DEG) {
      return false;
    }
  }
  return true;
}

/**
 * Checks whether the realized chain endpoint (last tile exit / Cup entry) arrives within
 * perpendicular, longitudinal, and heading limits along the terminal path leg.
 */
export function isEndpointWithinReach(
  prevNode: SplineWaypoint,
  endNode: SplineWaypoint,
  realizedEndPos: THREE.Vector3,
  realizedEndTan: THREE.Vector2
): boolean {
  const legDir = new THREE.Vector2(
    endNode.position[0] - prevNode.position[0],
    endNode.position[2] - prevNode.position[2]
  );
  if (legDir.lengthSq() <= 1e-6) return true;
  legDir.normalize();

  const dx = realizedEndPos.x - endNode.position[0];
  const dz = realizedEndPos.z - endNode.position[2];
  const perpErr = Math.abs(dx * -legDir.y + dz * legDir.x);
  const longErr = Math.abs(dx * legDir.x + dz * legDir.y);
  const endDot = THREE.MathUtils.clamp(realizedEndTan.dot(legDir), -1, 1);
  const endHeadingDeg = (Math.acos(endDot) * 180) / Math.PI;

  return (
    perpErr <= MAX_VALID_POS_ERROR_M &&
    longErr <= MAX_VALID_END_LONGITUDINAL_ERROR_M &&
    endHeadingDeg <= MAX_VALID_HEADING_ERROR_DEG
  );
}

/**
 * Evaluates full path-prefix feasibility: matching final elevation step, ramp run room,
 * per-step curve tracking tolerance, and terminal endpoint reach.
 */
export function evaluatePrefixFeasibility(params: {
  achievedElevStep: number;
  finalElevStep: number;
  prefixNodes: SplineWaypoint[];
  samples: FeasibilitySampleSummary[];
  steps: FeasibilityStepSummary[];
  realizedEndPos: THREE.Vector3;
  realizedEndTan: THREE.Vector2;
}): boolean {
  if (params.achievedElevStep !== params.finalElevStep) return false;
  if (!hasValidElevationRampRoom(params.prefixNodes)) return false;

  const cornerArcLocations: number[] = [];
  for (let si = 0; si < params.samples.length; si++) {
    if (params.samples[si].isSharpCorner || params.samples[si].isBevelArc) {
      cornerArcLocations.push(params.samples[si].s);
    }
  }

  if (!isStepTrackingWithinTolerance(params.steps, cornerArcLocations)) return false;

  if (params.prefixNodes.length >= 2) {
    const prevNode = params.prefixNodes[params.prefixNodes.length - 2];
    const endNode = params.prefixNodes[params.prefixNodes.length - 1];
    if (!isEndpointWithinReach(prevNode, endNode, params.realizedEndPos, params.realizedEndTan)) {
      return false;
    }
  }

  return true;
}
