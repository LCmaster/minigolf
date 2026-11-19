import { describe, it, expect } from "vitest";
import { autoDecorateHole } from "./AutoDecorate";
import type { PlacedTile, PlacedProp } from "../types/CourseSchema";

describe("AutoDecorate Unit Tests", () => {
  it("places hill knolls beneath elevated tiles and Carnival arch at tee", () => {
    const tiles: PlacedTile[] = [
      {
        instanceId: "t1",
        kitPieceId: "carnival_tee_6x6",
        position: [0, 1.5, 6],
        rotationY: 0,
        walls: { left: true, right: true },
      },
      {
        instanceId: "t2",
        kitPieceId: "carnival_straight_6m",
        position: [0, 0, 0],
        rotationY: 0,
        walls: { left: true, right: true },
      },
    ];

    const props = autoDecorateHole(tiles, [], "carnival_park", 42);

    const knoll = props.find((p) => p.propId === "terrain_hill_knoll_6x6");
    expect(knoll).toBeDefined();
    expect(knoll!.position[0]).toBe(0);
    expect(knoll!.position[1]).toBe(0);
    expect(knoll!.position[2]).toBe(6);

    const arch = props.find((p) => p.propId === "prop_carnival_arch_6m");
    expect(arch).toBeDefined();
  });

  it("keeps scattered nature props clear of all track tiles", () => {
    const tiles: PlacedTile[] = [
      {
        instanceId: "t1",
        kitPieceId: "carnival_straight_6m",
        position: [0, 0, 0],
        rotationY: 0,
        walls: { left: true, right: true },
      },
    ];
    const existing: PlacedProp[] = [];
    const props = autoDecorateHole(tiles, existing, "carnival_park", 77);

    const natureProps = props.filter(
      (p) => p.propId !== "terrain_hill_knoll_6x6" && p.propId !== "prop_carnival_arch_6m"
    );
    expect(natureProps.length).toBeGreaterThan(0);

    for (const p of natureProps) {
      const dist = Math.hypot(p.position[0] - 0, p.position[2] - 0);
      expect(dist).toBeGreaterThanOrEqual(6.0);
    }
  });
});

