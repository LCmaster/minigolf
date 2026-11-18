import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { HistoryManager } from "./HistoryManager";
import { TileEditCommands } from "./TileEditCommands";
import type { OpenSocketInfo } from "./SocketOverlayManager";

describe("TileEditCommands (TDD)", () => {
  let tilesMap: Map<string, any>;
  let courseManagerMock: any;
  let assetLoaderMock: any;
  let history: HistoryManager;
  let onSyncSpline: ReturnType<typeof vi.fn>;
  let onRefreshOpenSockets: ReturnType<typeof vi.fn>;
  let onCourseModified: ReturnType<typeof vi.fn>;
  let commands: TileEditCommands;

  beforeEach(() => {
    tilesMap = new Map();
    const putTile = (tileData: any) => {
      tilesMap.set(tileData.instanceId, {
        tileData,
        group: new THREE.Group(),
        pieceTemplate: {
          metadata: { id: tileData.kitPieceId, name: tileData.kitPieceId, hasDynamicWalls: true },
          sockets: [
            { id: "LOC_Socket_In", position: [0, 0, 3], normal: [0, 0, 1], type: "track", elevation: 0 },
            { id: "LOC_Socket_Out", position: [0, 0, -3], normal: [0, 0, -1], type: "track", elevation: 0 },
          ],
        },
      });
    };

    putTile({
      instanceId: "tee_1",
      kitPieceId: "carnival_tee_6x6",
      position: [0, 0, 0],
      rotationY: 0,
      walls: { left: true, right: true },
      connectedSockets: { LOC_Socket_Out: "straight_1" },
    });
    putTile({
      instanceId: "straight_1",
      kitPieceId: "carnival_straight_6m",
      position: [0, 0, -6],
      rotationY: 0,
      walls: { left: true, right: true },
      attachedTo: {
        parentInstanceId: "tee_1",
        parentSocketId: "LOC_Socket_Out",
        childSocketId: "LOC_Socket_In",
      },
      connectedSockets: { LOC_Socket_In: "tee_1" },
    });

    let splinePath: any = null;
    courseManagerMock = {
      getAllTiles: vi.fn(() => Array.from(tilesMap.values())),
      getTile: vi.fn((id: string) => tilesMap.get(id)),
      addTile: vi.fn((tileData: any) => putTile(tileData)),
      removeTile: vi.fn((id: string) => tilesMap.delete(id)),
      connectTileSocket: vi.fn((tileId: string, sockId: string, targetId: string) => {
        const t = tilesMap.get(tileId);
        if (!t) return false;
        t.tileData.connectedSockets = t.tileData.connectedSockets || {};
        t.tileData.connectedSockets[sockId] = targetId;
        return true;
      }),
      disconnectTileSocket: vi.fn((tileId: string, sockId: string) => {
        const t = tilesMap.get(tileId);
        if (!t?.tileData.connectedSockets || !(sockId in t.tileData.connectedSockets)) return false;
        delete t.tileData.connectedSockets[sockId];
        return true;
      }),
      findIncomingSocketLinks: vi.fn((tileId: string) => {
        const links: Array<{ tileId: string; socketId: string }> = [];
        for (const [otherId, other] of tilesMap.entries()) {
          for (const [sockId, target] of Object.entries(other.tileData.connectedSockets || {})) {
            if (target === tileId) links.push({ tileId: otherId, socketId: sockId });
          }
        }
        return links;
      }),
      toggleWall: vi.fn((id: string, side: "left" | "right") => {
        const t = tilesMap.get(id);
        if (!t) return false;
        t.tileData.walls[side] = !t.tileData.walls[side];
        return t.tileData.walls[side];
      }),
      setTileGap: vi.fn((id: string, isGap: boolean) => {
        const t = tilesMap.get(id);
        if (!t) return false;
        t.tileData.isGap = isGap;
        return true;
      }),
      swapTileType: vi.fn((id: string, nextPiece: string) => {
        const t = tilesMap.get(id);
        if (!t) return false;
        t.tileData.kitPieceId = nextPiece;
        return true;
      }),
      getSplinePath: vi.fn(() => splinePath),
      setSplinePath: vi.fn((p: any) => {
        splinePath = p;
      }),
      exportHoleData: vi.fn(() => ({
        holeNumber: 1,
        par: 3,
        teeTileId: "tee_1",
        cupTileId: "straight_1",
        tiles: Array.from(tilesMap.values()).map((t) => JSON.parse(JSON.stringify(t.tileData))),
        props: [],
        splinePath,
      })),
      loadHole: vi.fn((hole: any) => {
        tilesMap.clear();
        for (const t of hole.tiles) putTile(JSON.parse(JSON.stringify(t)));
        splinePath = hole.splinePath || null;
      }),
    };

    assetLoaderMock = {
      getPiece: vi.fn((id: string) => ({
        metadata: { id, name: id, hasDynamicWalls: true },
        sockets: [
          { id: "LOC_Socket_In", position: [0, 0, 3], normal: [0, 0, 1], type: "track", elevation: 0 },
          { id: "LOC_Socket_Out", position: [0, 0, -3], normal: [0, 0, -1], type: "track", elevation: 0 },
        ],
      })),
    };

    history = new HistoryManager();
    onSyncSpline = vi.fn();
    onRefreshOpenSockets = vi.fn();
    onCourseModified = vi.fn();

    commands = new TileEditCommands({
      courseManager: courseManagerMock,
      assetLoader: assetLoaderMock,
      history,
      onSyncSpline,
      onRefreshOpenSockets,
      onCourseModified,
    });
  });

  it("computes TileClickInfo with downstream detection", () => {
    const teeInfo = commands.getTileClickInfo("tee_1")!;
    expect(teeInfo.isTee).toBe(true);
    expect(teeInfo.isCup).toBe(false);
    expect(teeInfo.hasDownstream).toBe(true);
    expect(teeInfo.hasDynamicWalls).toBe(true);

    const endInfo = commands.getTileClickInfo("straight_1")!;
    expect(endInfo.isTee).toBe(false);
    expect(endInfo.hasDownstream).toBe(false);

    expect(commands.getTileClickInfo("missing")).toBeNull();
  });

  it("protects root tee tile and deletes/restores non-root tiles with incoming links via history", () => {
    expect(commands.deleteTile("tee_1")).toBe(false);
    expect(tilesMap.has("tee_1")).toBe(true);

    expect(commands.deleteTile("straight_1")).toBe(true);
    expect(tilesMap.has("straight_1")).toBe(false);
    expect(onRefreshOpenSockets).toHaveBeenCalled();
    expect(onCourseModified).toHaveBeenCalled();

    history.undo();
    expect(tilesMap.has("straight_1")).toBe(true);
    expect(courseManagerMock.connectTileSocket).toHaveBeenCalledWith(
      "tee_1",
      "LOC_Socket_Out",
      "straight_1"
    );
  });

  it("toggles walls and gaps with undo/redo via history", () => {
    expect(commands.toggleTileWall("straight_1", "left")).toBe(true);
    expect(tilesMap.get("straight_1").tileData.walls.left).toBe(false);

    history.undo();
    expect(tilesMap.get("straight_1").tileData.walls.left).toBe(true);

    expect(commands.toggleTileGap("tee_1")).toBe(false);
    expect(commands.toggleTileGap("straight_1")).toBe(true);
    expect(tilesMap.get("straight_1").tileData.isGap).toBe(true);

    history.undo();
    expect(tilesMap.get("straight_1").tileData.isGap).toBe(false);
  });

  it("swaps tile type and snaps new pieces onto open sockets with undo support", () => {
    expect(commands.swapTileType("straight_1", "carnival_turn_45deg_rounded")).toBe(true);
    expect(tilesMap.get("straight_1").tileData.kitPieceId).toBe("carnival_turn_45deg_rounded");

    history.undo();
    expect(tilesMap.get("straight_1").tileData.kitPieceId).toBe("carnival_straight_6m");

    const openSocket: OpenSocketInfo = {
      tileInstanceId: "straight_1",
      socketId: "LOC_Socket_Out",
      worldPosition: new THREE.Vector3(0, 0, -9),
      normal: new THREE.Vector3(0, 0, -1),
      type: "track",
      elevation: 0,
    };
    const countBefore = tilesMap.size;
    commands.snapPieceToSocket(openSocket, "carnival_green_cup_6x6");
    expect(tilesMap.size).toBe(countBefore + 1);
    expect(courseManagerMock.connectTileSocket).toHaveBeenCalled();

    history.undo();
    expect(tilesMap.size).toBe(countBefore);
  });
});
