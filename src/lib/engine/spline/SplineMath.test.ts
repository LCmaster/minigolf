import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  resolveSpanControlPoints,
  evaluateCubicBezier2D,
  evaluateCubicBezierTangent2D,
  sampleSplineChain,
  projectPointOntoSpline,
  getSampleAtArcLength,
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
});
