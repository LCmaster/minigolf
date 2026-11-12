import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  snapCoordinateToGrid,
  snapPointXZToGrid,
  snapBevelRadiusToGrid,
  getCornerBevelGeometry,
  bisectorBevelDragToRadius,
  sampleSplineChain,
  getSampleAtArcLength,
  projectPointOntoSpline,
  getElevationStep,
  cloneSplinePath,
} from "./PolylineMath";
import type { SplineWaypoint } from "../types/CourseSchema";

function wp(id: string, x: number, y: number, z: number, bevelRadius = 0): SplineWaypoint {
  return {
    id,
    position: [x, y, z],
    handleOffset: [0, 0],
    corner: false,
    elevationStep: Math.round(y / 1.5),
    bevelRadius,
  };
}

describe("PolylineMath", () => {
  it("snaps coordinates, points, and bevel radii cleanly to origin-aligned world grids", () => {
    expect(snapCoordinateToGrid(2.6, 1)).toBe(3);
    expect(snapCoordinateToGrid(-0.2, 3)).toBe(0);
    expect(Object.is(snapCoordinateToGrid(-0.2, 3), -0)).toBe(false);

    const pt = snapPointXZToGrid(new THREE.Vector3(3.7, 1.5, -5.2), 3);
    expect(pt.x).toBe(3);
    expect(pt.y).toBe(1.5);
    expect(pt.z).toBe(-6);

    expect(snapBevelRadiusToGrid(4.4, 1)).toBe(4);
    expect(snapBevelRadiusToGrid(0.1, 1)).toBeCloseTo(0.1);
  });

  it("computes corner bevel geometry and inverts bisector drag projection", () => {
    const prev: [number, number, number] = [0, 0, 0];
    const corner: [number, number, number] = [0, 0, -18];
    const next: [number, number, number] = [18, 0, -18];

    const sharp = getCornerBevelGeometry(prev, corner, next, 0);
    expect(sharp.isValidCorner).toBe(true);
    expect(sharp.isBeveled).toBe(false);
    expect(sharp.turnAngle).toBeCloseTo(Math.PI / 2, 3);

    const beveled = getCornerBevelGeometry(prev, corner, next, 6);
    expect(beveled.isBeveled).toBe(true);
    expect(beveled.trimDist).toBeCloseTo(6, 3);

    const recoveredRadius = bisectorBevelDragToRadius(prev, corner, next, [
      beveled.handlePosXZ.x,
      beveled.handlePosXZ.y,
    ]);
    expect(recoveredRadius).toBeCloseTo(6, 2);
  });

  it("samples straight legs + bevel arcs, evaluates arc length queries, and clones paths", () => {
    const nodes = [
      wp("a", 0, 0, 0),
      wp("b", 0, 0, -18, 6),
      wp("c", 18, 0, -18),
    ];
    const samples = sampleSplineChain(nodes, 12);
    expect(samples.some((s) => s.isBevelArc)).toBe(true);

    const mid = getSampleAtArcLength(samples, 6);
    expect(mid).not.toBeNull();
    const proj = projectPointOntoSpline(samples, new THREE.Vector2(0, -6));
    expect(proj!.position.z).toBeCloseTo(-6, 1);

    expect(getElevationStep(wp("h", 0, 3.0, 0))).toBe(2);
    const cloned = cloneSplinePath({ closed: false, nodes });
    cloned.nodes[0].position[0] = 99;
    expect(nodes[0].position[0]).toBe(0);
  });
});

