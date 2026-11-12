import { describe, it, expect } from "vitest";
import { carnivalParkCourse } from "./carnivalParkCourse";
import { carnivalExpansionHoles } from "./carnivalShowcaseHoles";

describe("Carnival Park Hole 7 Theme & Sockets (TDD)", () => {
  it("uses pure Carnival Park themed kit pieces in Hole 7 (no classical hazard_sand_trap)", () => {
    const hole7 = carnivalParkCourse.holes.find((h) => h.holeNumber === 7);
    expect(hole7).toBeDefined();

    const pieceIds = hole7!.tiles.map((t) => t.kitPieceId);
    expect(pieceIds).not.toContain("hazard_sand_trap_6x6");

    for (const pieceId of pieceIds) {
      expect(pieceId.startsWith("carnival_")).toBe(true);
    }
  });

  it("has valid socket chain connecting tee to cup through the carnival straight replacement", () => {
    const hole7 = carnivalExpansionHoles.find((h) => h.holeNumber === 7);
    expect(hole7).toBeDefined();

    const straightTile = hole7!.tiles.find((t) => t.kitPieceId === "carnival_straight_6m");
    expect(straightTile).toBeDefined();
    expect(straightTile?.attachedTo?.parentInstanceId).toBe("h7_t1");
    expect(straightTile?.connectedSockets?.LOC_Socket_In).toBe("h7_t1");
    expect(straightTile?.connectedSockets?.LOC_Socket_Out).toBe("h7_t2");
  });
});
