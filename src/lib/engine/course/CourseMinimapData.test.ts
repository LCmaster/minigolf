import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { carnivalParkCourse } from "../../courses/carnivalParkCourse";
import HoleMinimap from "../../components/courses/HoleMinimap.svelte";
import type { KitManifest } from "../types/KitTypes";
import { buildHoleMinimap } from "./CourseMinimapData";

describe("CourseMinimapData", () => {
  it("computes tight SVG viewBox, segments, tee and cup coordinates for all 9 showcase holes", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.resolve("static/models/kit/manifest.json"), "utf-8")
    ) as KitManifest;

    for (const hole of carnivalParkCourse.holes) {
      const minimap = buildHoleMinimap(hole, manifest);

      expect(minimap.segments.length).toBeGreaterThanOrEqual(hole.tiles.length - 1);
      expect(minimap.teePoint).not.toBeNull();
      expect(minimap.cupPoint).not.toBeNull();

      // Tee and Cup are spatially separated
      const dist = Math.hypot(
        minimap.cupPoint!.x - minimap.teePoint!.x,
        minimap.cupPoint!.z - minimap.teePoint!.z
      );
      expect(dist).toBeGreaterThan(5);

      // Valid finite SVG viewBox of 4 numbers with positive width and height
      const vbParts = minimap.viewBox.split(" ").map(Number);
      expect(vbParts).toHaveLength(4);
      expect(vbParts.every(Number.isFinite)).toBe(true);
      expect(vbParts[2]).toBeGreaterThanOrEqual(12);
      expect(vbParts[3]).toBeGreaterThanOrEqual(12);
      expect(minimap.polylinePoints.trim().length).toBeGreaterThan(0);
    }

    // Elevated holes (e.g., Hole 2 has ramp up) flag elevation segments cleanly
    const hole2 = buildHoleMinimap(carnivalParkCourse.holes[1], manifest);
    expect(hole2.segments.some((s) => s.elevationStep > 0 || s.isRamp)).toBe(true);
  });

  it("falls back gracefully without manifest using explicit tile positions or spline nodes", () => {
    const hole = carnivalParkCourse.holes[0];
    const minimap = buildHoleMinimap(hole, null);

    expect(minimap.viewBox.split(" ")).toHaveLength(4);
    expect(minimap.teePoint).not.toBeNull();
    expect(minimap.cupPoint).not.toBeNull();
  });

  it("renders HoleMinimap Svelte component with SVG geometry and accessible aria-label", () => {
    const hole = carnivalParkCourse.holes[0];
    const res = (HoleMinimap as any).render({ hole, manifest: null });
    expect(res.html).toContain("<svg");
    expect(res.html).toContain("viewBox=");
    expect(res.html).toContain("Top-down preview of Sunny Creek");
  });
});
