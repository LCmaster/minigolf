import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Kit Manifest & Arcade Standard (TDD)", () => {
  const manifestPath = path.resolve("static/models/kit/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

  it("conforms to version 2.0.0 arcade specifications", () => {
    expect(manifest.version).toBe("2.0.0");
    expect(manifest.gridSize).toBe(6.0);
    expect(manifest.turfWidth).toBe(5.2);
    expect(manifest.railGirth).toBe(0.4);
    expect(manifest.railHeight).toBe(0.6);
    expect(manifest.floorSlabDepth).toBe(0.5);
    expect(manifest.cupRadius).toBe(0.28);
  });

  it("contains all 32 base arcade pieces and 24 Carnival Park kitbash pieces", () => {
    const pieces = Object.keys(manifest.pieces);
    expect(pieces.length).toBe(56);

    expect(pieces).toContain("tee_box_6x6");
    expect(pieces).toContain("straight_6m");
    expect(pieces).toContain("green_cup_standard_6x6");
    expect(pieces).toContain("green_cup_funnel_6x6");

    for (const ang of [15, 30, 45, 60, 75, 90]) {
      expect(pieces).toContain(`turn_${ang}deg_crisp`);
      expect(pieces).toContain(`turn_${ang}deg_rounded`);
    }
    expect(pieces).toContain("turn_banked_90deg_6x6");

    expect(pieces).toContain("bridge_overpass_6x12");
    expect(pieces).toContain("obstacle_windmill_6x12");
    expect(pieces).toContain("hazard_sand_trap_6x6");
    expect(pieces).toContain("hazard_water_channel_6x6");
    expect(pieces).toContain("hazard_booster_strip_6x3");

    // Carnival Park kit pieces
    for (const cid of [
      "carnival_tee_6x6",
      "carnival_straight_6m",
      "carnival_ramp_up_15deg_6x6",
      "carnival_ramp_down_15deg_6x6",
      "carnival_turn_45deg_rounded",
      "carnival_turn_90deg_rounded",
      "carnival_bridge_pond_6x12",
      "carnival_windmill_6x12",
      "carnival_green_cup_6x6",
      "terrain_hill_knoll_6x6",
      "terrain_pond_patch_6x6",
      "terrain_waterfall_lagoon_12x12",
      "prop_carnival_arch_6m",
      "prop_bigtop_gate_6m",
      "prop_bumper_peg_yellow",
      "prop_bumper_peg_blue",
      "prop_bumper_peg_red",
      "prop_tree_puffy",
      "prop_toadstool_pair",
    ]) {
      expect(pieces).toContain(cid);
    }
  });

  it("verifies every piece GLB file actually exists on disk", () => {
    for (const piece of Object.values<any>(manifest.pieces)) {
      const glbOnDisk = path.resolve("static", piece.glbPath);
      expect(fs.existsSync(glbOnDisk)).toBe(true);
      const stats = fs.statSync(glbOnDisk);
      expect(stats.size).toBeGreaterThan(100);
    }
  });

  it("verifies master .blend file exists in assets/", () => {
    const blendPath = path.resolve("assets/minigolf_kitbash_master.blend");
    expect(fs.existsSync(blendPath)).toBe(true);
    expect(fs.statSync(blendPath).size).toBeGreaterThan(10000);
  });
});

