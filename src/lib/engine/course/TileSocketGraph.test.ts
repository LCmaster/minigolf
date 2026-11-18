import { describe, it, expect } from "vitest";
import type { PlacedTile } from "../types/CourseSchema";
import {
  connectSocket,
  disconnectSocket,
  findIncomingLinks,
  removeLinksTo,
  type TileDataMap,
} from "./TileSocketGraph";

const walls = { left: true, right: true };

function makeTiles(): TileDataMap {
  const make = (instanceId: string, connectedSockets?: Record<string, string>) => ({
    tileData: { instanceId, kitPieceId: "carnival_straight_6m", walls, connectedSockets } as PlacedTile,
  });
  return new Map([
    ["a", make("a", { LOC_Socket_Out: "b" })],
    ["b", make("b", { LOC_Socket_In: "a", LOC_Socket_Out: "c" })],
    ["c", make("c")],
  ]);
}

describe("TileSocketGraph", () => {
  it("connects a socket and creates the link record when missing", () => {
    const tiles = makeTiles();
    expect(connectSocket(tiles, "c", "LOC_Socket_In", "b")).toBe(true);
    expect(tiles.get("c")!.tileData.connectedSockets).toEqual({ LOC_Socket_In: "b" });
    expect(connectSocket(tiles, "missing", "LOC_Socket_In", "b")).toBe(false);
  });

  it("disconnects only existing links", () => {
    const tiles = makeTiles();
    expect(disconnectSocket(tiles, "a", "LOC_Socket_Out")).toBe(true);
    expect(tiles.get("a")!.tileData.connectedSockets).toEqual({});
    expect(disconnectSocket(tiles, "a", "LOC_Socket_Out")).toBe(false);
    expect(disconnectSocket(tiles, "c", "LOC_Socket_In")).toBe(false);
    expect(disconnectSocket(tiles, "missing", "LOC_Socket_In")).toBe(false);
  });

  it("finds every incoming link pointing at a tile", () => {
    const tiles = makeTiles();
    expect(findIncomingLinks(tiles, "b")).toEqual([{ tileId: "a", socketId: "LOC_Socket_Out" }]);
    expect(findIncomingLinks(tiles, "a")).toEqual([{ tileId: "b", socketId: "LOC_Socket_In" }]);
    expect(findIncomingLinks(tiles, "unknown")).toEqual([]);
  });

  it("removes all links that target a removed tile", () => {
    const tiles = makeTiles();
    removeLinksTo(tiles, "b");
    expect(tiles.get("a")!.tileData.connectedSockets).toEqual({});
    expect(tiles.get("b")!.tileData.connectedSockets).toEqual({ LOC_Socket_In: "a", LOC_Socket_Out: "c" });
  });
});
