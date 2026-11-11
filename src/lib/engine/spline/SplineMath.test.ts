import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  resolveSpanControlPoints,
  evaluateCubicBezier2D,
  evaluateCubicBezierTangent2D,
  sampleSplineChain,
  projectPointOntoSpline,
  getSampleAtArcLength,
  tangentToPerpHandleOffset,
  perpHandleOffsetToTangent,
  getCornerBevelGeometry,
  bisectorBevelDragToRadius,
  snapCoordinateToGrid,
  snapPointXZToGrid,
  snapBevelRadiusToGrid,
} from "./SplineMath";
import type { SplineWaypoint } from "../types/CourseSchema";

describe("SplineMath Unit Tests", () => {
  it("enforces C1 mirrored tangents on smooth nodes and collapses tangents on corners", () => {
    const a: SplineWaypoint = { id: "a", position: [0, 0, 0], handleOffset: [0, -3], corner: false };
    const b: SplineWaypoint = { id: "b", position: [12, 0, -12], handleOffset: [4, 0], corner: false };
    const c: SplineWaypoint = { id: "c", position: [24, 0, 0], handleOffset: [0, 3], corner: false };

    const span1 = resolveSpanControlPoints(a, b);
    const span2 = resolveSpanControlPoints(b, c);

    // b incoming tangent = -handleOffset = (-4, 0); b outgoing tangent = +handleOffset = (+4, 0)
    const tanEndSpan1 = evaluateCubicBezierTangent2D(span1.p0, span1.p1, span1.p2, span1.p3, 1.0);
    const tanStartSpan2 = evaluateCubicBezierTangent2D(span2.p0, span2.p1, span2.p2, span2.p3, 0.0);
    expect(tanEndSpan1.x).toBeCloseTo(1, 3);
    expect(tanEndSpan1.y).toBeCloseTo(0, 3);
    expect(tanStartSpan2.x).toBeCloseTo(1, 3);
    expect(tanStartSpan2.y).toBeCloseTo(0, 3);

    // Sharp corner collapses tangent handles to vertex position
    const sharpB: SplineWaypoint = { ...b, corner: true };
    const sharpSpan1 = resolveSpanControlPoints(a, sharpB);
    expect(sharpSpan1.p2.equals(sharpSpan1.p3)).toBe(true);
  });

  it("samples monotonic cumulative arc-length and projects points accurately", () => {
    const nodes: SplineWaypoint[] = [
      { id: "n0", position: [0, 0, 0], handleOffset: [0, -4] },
      { id: "n1", position: [12, 1.5, -18], handleOffset: [4, 0], elevationStep: 1 },
    ];
    const samples = sampleSplineChain(nodes, 20);
    expect(samples.length).toBe(21);

    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].s).toBeGreaterThan(samples[i - 1].s);
    }

    const totalLen = samples[samples.length - 1].s;
    expect(totalLen).toBeGreaterThan(20);

    const mid = getSampleAtArcLength(samples, totalLen * 0.5)!;
    const projected = projectPointOntoSpline(samples, new THREE.Vector2(mid.position.x, mid.position.z));
    expect(projected).not.toBeNull();
    expect(Math.abs(projected!.s - mid.s)).toBeLessThan(1.2);
  });

  it("maps symmetric tangents to 90deg perpendicular handle arms with forward-safe clamping and relaxed Cup ends", () => {
    // 1. Tangent (0, -3) [North] <-> Right-hand perp (3, 0) [East]
    const perp = tangentToPerpHandleOffset(0, -3);
    expect(perp[0]).toBeCloseTo(3, 4);
    expect(perp[1]).toBeCloseTo(0, 4);
    expect(perp[0] * 0 + perp[1] * -3).toBeCloseTo(0, 5); // Orthogonal

    const recovered = perpHandleOffsetToTangent(perp[0], perp[1], [0, 0, 0], [0, 0, -24]);
    expect(recovered[0]).toBeCloseTo(0, 4);
    expect(recovered[1]).toBeCloseTo(-3, 4);

    // 2. Pulling handle opposite/backward side clamps tangent within ±105° of neighbor chord (never 180° loop)
    const backwardPerp = [-4, 0] as [number, number]; // Maps naively to (0, +4) South, opposite North chord
    const safeTangent = perpHandleOffsetToTangent(backwardPerp[0], backwardPerp[1], [0, 0, 0], [0, 0, -24]);
    const dir = new THREE.Vector2(safeTangent[0], safeTangent[1]).normalize();
    const chordDot = dir.x * 0 + dir.y * -1;
    expect(chordDot).toBeGreaterThanOrEqual(Math.cos((105 * Math.PI) / 180) - 1e-4);

    // 3. Relaxed terminal span aligns Cup arrival smoothly along (p3 - p1) regardless of Cup handleOffset
    const mid: SplineWaypoint = { id: "mid", position: [0, 0, 0], handleOffset: [0, -3], corner: false };
    const cupWithTwist: SplineWaypoint = { id: "cup", position: [12, 0, -18], handleOffset: [-8, 0], corner: false };
    const relaxedSpan = resolveSpanControlPoints(mid, cupWithTwist, { relaxedEnd: true });
    const arrivalTan = evaluateCubicBezierTangent2D(
      relaxedSpan.p0,
      relaxedSpan.p1,
      relaxedSpan.p2,
      relaxedSpan.p3,
      1.0
    );
    const expectedDir = new THREE.Vector2(12 - 0, -18 - -3).normalize();
    expect(arrivalTan.x).toBeCloseTo(expectedDir.x, 4);
    expect(arrivalTan.y).toBeCloseTo(expectedDir.y, 4);
  });

  it("samples straight polyline legs with exact circular corner bevel geometry & bisector dragging", () => {
    const p0: [number, number, number] = [0, 0, 0];
    const p1: [number, number, number] = [0, 0, -18];
    const p2: [number, number, number] = [18, 0, -18];

    // Sharp corner (R = 0): valid bisector pointing (+X, +Z), no arc trim
    const sharp = getCornerBevelGeometry(p0, p1, p2, 0);
    expect(sharp.isValidCorner).toBe(true);
    expect(sharp.isBeveled).toBe(false);
    expect(sharp.turnAngle).toBeCloseTo(Math.PI / 2, 4);
    expect(sharp.bisectorXZ.x).toBeCloseTo(Math.SQRT1_2, 4);
    expect(sharp.bisectorXZ.y).toBeCloseTo(Math.SQRT1_2, 4);

    // Bevel radius R = 6m on 90° corner -> trimDist = 6m, arc center = (6, -12)
    const beveled = getCornerBevelGeometry(p0, p1, p2, 6.0);
    expect(beveled.isBeveled).toBe(true);
    expect(beveled.trimDist).toBeCloseTo(6.0, 4);
    expect(beveled.entryXZ.x).toBeCloseTo(0, 4);
    expect(beveled.entryXZ.y).toBeCloseTo(-12, 4);
    expect(beveled.exitXZ.x).toBeCloseTo(6, 4);
    expect(beveled.exitXZ.y).toBeCloseTo(-18, 4);
    expect(beveled.arcCenterXZ.x).toBeCloseTo(6, 4);
    expect(beveled.arcCenterXZ.y).toBeCloseTo(-12, 4);

    // Dragging handle along bisector recovers exact bevel radius and snaps to 0 near apex
    const recoveredR = bisectorBevelDragToRadius(p0, p1, p2, [beveled.handlePosXZ.x, beveled.handlePosXZ.y]);
    expect(recoveredR).toBeCloseTo(6.0, 3);
    expect(bisectorBevelDragToRadius(p0, p1, p2, [0.5, -17.5])).toBe(0);

    // Polyline sample chain tracks straight legs and circular bevel samples accurately
    const nodes: SplineWaypoint[] = [
      { id: "n0", position: p0, handleOffset: [0, -3], bevelRadius: 0 },
      { id: "n1", position: p1, handleOffset: [0, -3], bevelRadius: 6 },
      { id: "n2", position: p2, handleOffset: [3, 0], bevelRadius: 0 },
    ];
    const samples = sampleSplineChain(nodes, 16);
    const bevelSamples = samples.filter((s) => s.isBevelArc);
    expect(bevelSamples.length).toBeGreaterThan(0);
    for (const s of bevelSamples) {
      const distFromCenter = Math.hypot(s.position.x - 6, s.position.z - -12);
      expect(distFromCenter).toBeCloseTo(6.0, 3);
    }
  });

  it("snaps coordinates cleanly to 1m, 3m, and 6m origin-aligned grid cells and integer bevels", () => {
    expect(snapCoordinateToGrid(0.4, 1)).toBe(0);
    expect(Object.is(snapCoordinateToGrid(-0.2, 1), -0)).toBe(false);
    expect(snapCoordinateToGrid(11.6, 1)).toBe(12);
    expect(snapCoordinateToGrid(-17.4, 1)).toBe(-17);
    expect(snapCoordinateToGrid(-17.4, 3)).toBe(-18);
    expect(snapCoordinateToGrid(14.1, 6)).toBe(12);
    expect(snapCoordinateToGrid(5.37, 0)).toBeCloseTo(5.37, 5);

    const pt = snapPointXZToGrid(new THREE.Vector3(7.4, 1.5, -16.8), 3);
    expect(pt.x).toBe(6);
    expect(pt.y).toBe(1.5);
    expect(pt.z).toBe(-18);

    expect(snapBevelRadiusToGrid(5.7, 1)).toBe(6);
    expect(snapBevelRadiusToGrid(0.1, 1)).toBe(0.1);
  });
});

