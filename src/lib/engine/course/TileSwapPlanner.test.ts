import { describe, it, expect } from "vitest";
import type { HoleData, PlacedTile } from "../types/CourseSchema";
import { planTileSwap } from "./TileSwapPlanner";

const TWO_SOCKETS = [{ id: "LOC_Socket_In" }, { id: "LOC_Socket_Out" }];
const walls = { left: true, right: true };

/** tee -> s1 -> s2 -> cup chain with attachedTo + connectedSockets links. */
function makeHole(): HoleData {
  const tiles: PlacedTile[] = [
    {
      instanceId: "tee",
      kitPieceId: "carnival_tee_6x6",
      position: [0, 0, 6],
      rotationY: 0,
      walls,
      connectedSockets: { LOC_Socket_Out: "s1" },
    },
    {
      instanceId: "s1",
      kitPieceId: "carnival_straight_6m",
      position: [0, 0, 0],
      rotationY: 0,
      walls,
      attachedTo: { parentInstanceId: "tee", parentSocketId: "LOC_Socket_Out" },
      connectedSockets: { LOC_Socket_In: "tee", LOC_Socket_Out: "s2" },
    },
    {
      instanceId: "s2",
      kitPieceId: "carnival_straight_6m",
      position: [0, 0, -6],
      rotationY: 0,
      walls,
      attachedTo: { parentInstanceId: "s1", parentSocketId: "LOC_Socket_Out" },
      connectedSockets: { LOC_Socket_In: "s1", LOC_Socket_Out: "cup" },
    },
    {
      instanceId: "cup",
      kitPieceId: "carnival_green_cup_6x6",
      position: [0, 0, -12],
      rotationY: 0,
      walls,
      attachedTo: { parentInstanceId: "s2", parentSocketId: "LOC_Socket_Out" },
      connectedSockets: { LOC_Socket_In: "s2" },
    },
  ];
  return {
    holeNumber: 1,
    par: 3,
    teeTileId: "tee",
    cupTileId: "cup",
    tiles,
    props: [],
  };
}

const byId = (hole: HoleData, id: string) => hole.tiles.find((t) => t.instanceId === id)!;

describe("planTileSwap", () => {
  it("returns null for unknown tiles", () => {
    expect(planTileSwap(makeHole(), "missing", "carnival_straight_6m", TWO_SOCKETS)).toBeNull();
  });

  it("refuses to turn a tee or cup into a non-tee/non-cup piece", () => {
    expect(planTileSwap(makeHole(), "tee", "carnival_straight_6m", TWO_SOCKETS)).toBeNull();
    expect(planTileSwap(makeHole(), "cup", "carnival_straight_6m", TWO_SOCKETS)).toBeNull();
  });

  it("refuses to swap a tile that still has downstream tiles into a cup", () => {
    expect(planTileSwap(makeHole(), "s1", "carnival_green_cup_6x6", TWO_SOCKETS)).toBeNull();
  });

  it("refuses single-socket replacements when downstream tiles must stay chained", () => {
    expect(planTileSwap(makeHole(), "s1", "carnival_windmill_stub", [{ id: "LOC_Socket_In" }])).toBeNull();
  });

  it("swaps the piece id and re-chains downstream tiles without cached transforms", () => {
    const next = planTileSwap(makeHole(), "s1", "carnival_turn_30deg_rounded", TWO_SOCKETS)!;
    const s1 = byId(next, "s1");
    const s2 = byId(next, "s2");

    expect(s1.kitPieceId).toBe("carnival_turn_30deg_rounded");
    expect(s1.position).toBeUndefined();
    expect(s1.attachedTo).toEqual({
      parentInstanceId: "tee",
      parentSocketId: "LOC_Socket_Out",
      childSocketId: "LOC_Socket_In",
    });
    expect(s1.connectedSockets).toEqual({ LOC_Socket_In: "tee", LOC_Socket_Out: "s2" });

    expect(s2.position).toBeUndefined();
    expect(s2.rotationY).toBeUndefined();
    expect(s2.attachedTo).toEqual({
      parentInstanceId: "s1",
      parentSocketId: "LOC_Socket_Out",
      childSocketId: "LOC_Socket_In",
    });
    expect(byId(next, "tee").connectedSockets).toEqual({ LOC_Socket_Out: "s1" });
  });

  it("mirrors entry/exit sockets when reverseDirection is requested", () => {
    const next = planTileSwap(makeHole(), "s1", "carnival_turn_30deg_rounded", TWO_SOCKETS, {
      reverseDirection: true,
    })!;
    const s1 = byId(next, "s1");
    const s2 = byId(next, "s2");

    expect(s1.attachedTo?.childSocketId).toBe("LOC_Socket_Out");
    expect(s1.connectedSockets).toEqual({ LOC_Socket_Out: "tee", LOC_Socket_In: "s2" });
    expect(s2.attachedTo?.parentSocketId).toBe("LOC_Socket_In");
  });

  it("keeps parent-before-child ordering and clears gap flag on the swapped tile", () => {
    const hole = makeHole();
    byId(hole, "s1").isGap = true;
    const next = planTileSwap(hole, "s1", "carnival_turn_30deg_rounded", TWO_SOCKETS)!;
    expect(next.tiles.map((t) => t.instanceId)).toEqual(["tee", "s1", "s2", "cup"]);
    expect(byId(next, "s1").isGap).toBe(false);
  });
});

