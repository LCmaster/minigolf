import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  evaluatePrefixFeasibility,
  hasValidElevationRampRoom,
  isEndpointWithinReach,
  isStepTrackingWithinTolerance,
} from "./PathFeasibility";
import type { SplineWaypoint } from "../types/CourseSchema";

function makeNode(x: number, y: number, z: number, elevationStep: number = 0): SplineWaypoint {
  return {
    id: `n_${x}_${z}`,
    position: [x, y, z],
    handleOffset: [0, 0],
    corner: false,
    elevationStep,
  };
}

describe("PathFeasibility", () => {
  it("rejects elevation changes lacking 6m physical ramp run length", () => {
    const tooSteep = [makeNode(0, 0, 0, 0), makeNode(0, 1.5, -3.0, 1)];
    const validRun = [makeNode(0, 0, 0, 0), makeNode(0, 1.5, -6.0, 1)];

    expect(hasValidElevationRampRoom(tooSteep)).toBe(false);
    expect(hasValidElevationRampRoom(validRun)).toBe(true);
  });

  it("allows corner-sweep positional tolerance near corners while rejecting straight drift or sharp heading errors", () => {
    // Near corner s=12, posErr 2.30m (< 2.45m) with large heading sweep passes
    expect(
      isStepTrackingWithinTolerance(
        [{ kind: "straight", posErr: 2.3, headingDeg: 20, projS: 11.5 }],
        [12.0]
      )
    ).toBe(true);

    // Far from corner, posErr 2.30m (> 2.05m) fails
    expect(
      isStepTrackingWithinTolerance(
        [{ kind: "straight", posErr: 2.3, headingDeg: 2, projS: 3.0 }],
        [12.0]
      )
    ).toBe(false);

    // Far from corner, heading > 12.5 deg fails
    expect(
      isStepTrackingWithinTolerance(
        [{ kind: "straight", posErr: 0.4, headingDeg: 18, projS: 3.0 }],
        [12.0]
      )
    ).toBe(false);
  });

  it("validates endpoint longitudinal, perpendicular, and heading reach", () => {
    const prev = makeNode(0, 0, 0);
    const end = makeNode(0, 0, -18);

    expect(
      isEndpointWithinReach(prev, end, new THREE.Vector3(0.5, 0, -19.0), new THREE.Vector2(0, -1))
    ).toBe(true);

    // Too far off laterally
    expect(
      isEndpointWithinReach(prev, end, new THREE.Vector3(3.0, 0, -18.0), new THREE.Vector2(0, -1))
    ).toBe(false);

    // Too far short longitudinally
    expect(
      isEndpointWithinReach(prev, end, new THREE.Vector3(0, 0, -14.0), new THREE.Vector2(0, -1))
    ).toBe(false);

    // Heading rotated 45 deg off leg direction
    expect(
      isEndpointWithinReach(
        prev,
        end,
        new THREE.Vector3(0, 0, -18.0),
        new THREE.Vector2(Math.SQRT1_2, -Math.SQRT1_2)
      )
    ).toBe(false);
  });

  it("evaluates complete prefix feasibility including elevation match and corner arc detection", () => {
    const nodes = [makeNode(0, 0, 0, 0), makeNode(0, 0, -12, 0)];
    const valid = evaluatePrefixFeasibility({
      achievedElevStep: 0,
      finalElevStep: 0,
      prefixNodes: nodes,
      samples: [
        { s: 0, isSharpCorner: false, isBevelArc: false },
        { s: 12, isSharpCorner: false, isBevelArc: false },
      ],
      steps: [{ kind: "straight", posErr: 0.2, headingDeg: 1.0, projS: 6 }],
      realizedEndPos: new THREE.Vector3(0, 0, -12),
      realizedEndTan: new THREE.Vector2(0, -1),
    });
    expect(valid).toBe(true);

    const wrongElev = evaluatePrefixFeasibility({
      achievedElevStep: 0,
      finalElevStep: 1,
      prefixNodes: nodes,
      samples: [],
      steps: [],
      realizedEndPos: new THREE.Vector3(0, 0, -12),
      realizedEndTan: new THREE.Vector2(0, -1),
    });
    expect(wrongElev).toBe(false);
  });
});
