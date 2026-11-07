import { describe, it, expect } from "vitest";
import { HoleGenerator, type GenerationOptions } from "../src/lib/engine/wfc/HoleGenerator";

describe("HoleGenerator Unit Tests", () => {
  const mockLoader: any = {};
  const generator = new HoleGenerator(mockLoader);

  it("generates valid HoleData with correct tee, cup, and par ratings", () => {
    const options: GenerationOptions = {
      par: 2,
      style: "straightforward",
      includeObstacles: false,
    };

    const hole = generator.generateHole(options);

    expect(hole.par).toBe(2);
    expect(hole.holeNumber).toBe(1);
    expect(hole.tiles.length).toBeGreaterThanOrEqual(3);

    // Tee is first tile
    expect(hole.teeTileId).toBe(hole.tiles[0].instanceId);
    expect(hole.tiles[0].kitPieceId).toBe("tee_box_4x4");

    // Cup is last tile
    expect(hole.cupTileId).toBe(hole.tiles[hole.tiles.length - 1].instanceId);
    expect(hole.tiles[hole.tiles.length - 1].kitPieceId).toBe("green_cup_standard_4x4");
  });

  it("scales number of fairway segments with requested Par", () => {
    const par2 = generator.generateHole({ par: 2, style: "straightforward", includeObstacles: false });
    const par3 = generator.generateHole({ par: 3, style: "straightforward", includeObstacles: false });
    const par4 = generator.generateHole({ par: 4, style: "straightforward", includeObstacles: false });
    const par5 = generator.generateHole({ par: 5, style: "straightforward", includeObstacles: false });

    expect(par2.tiles.length).toBeLessThan(par3.tiles.length);
    expect(par3.tiles.length).toBeLessThan(par4.tiles.length);
    expect(par4.tiles.length).toBeLessThan(par5.tiles.length);
  });

  it("creates seamless end-to-end socket connections across all tiles", () => {
    const hole = generator.generateHole({
      par: 4,
      style: "straightforward",
      includeObstacles: false,
    });

    for (let i = 0; i < hole.tiles.length - 1; i++) {
      const current = hole.tiles[i];
      const next = hole.tiles[i + 1];

      expect(current.connectedSockets["LOC_Socket_Out"]).toBe(next.instanceId);
      expect(next.connectedSockets["LOC_Socket_In"]).toBe(current.instanceId);
    }
  });

  it("inserts elevation ramps and funnel cup when style is elevation", () => {
    const hole = generator.generateHole({
      par: 4,
      style: "elevation",
      includeObstacles: false,
    });

    const kitIds = hole.tiles.map((t) => t.kitPieceId);
    expect(kitIds).toContain("ramp_up_15deg_4x4");
    expect(kitIds).toContain("ramp_down_15deg_4x4");
    expect(kitIds[kitIds.length - 1]).toBe("green_cup_funnel_4x4");

    // Verify elevation change exists
    const yCoordinates = hole.tiles.map((t) => t.position[1]);
    const maxElevation = Math.max(...yCoordinates);
    expect(maxElevation).toBeGreaterThan(0);
  });

  it("inserts curved turns and changes yaw when style is winding", () => {
    const hole = generator.generateHole({
      par: 3,
      style: "winding",
      includeObstacles: false,
    });

    const kitIds = hole.tiles.map((t) => t.kitPieceId);
    expect(kitIds).toContain("turn_45deg_rounded");

    const yaws = hole.tiles.map((t) => t.rotationY);
    const hasDifferentYaw = yaws.some((yaw) => yaw !== 0);
    expect(hasDifferentYaw).toBe(true);
  });

  it("inserts windmill obstacle at midpoint when includeObstacles is true and par >= 3", () => {
    const hole = generator.generateHole({
      par: 3,
      style: "straightforward",
      includeObstacles: true,
    });

    const kitIds = hole.tiles.map((t) => t.kitPieceId);
    expect(kitIds).toContain("obstacle_windmill_4x8");
  });
});
