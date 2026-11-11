import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as THREE from "three";
import type { AssetLoader, ParsedKitPiece } from "../kitbash/AssetLoader";
import type { KitManifest } from "../types/KitTypes";
import type { SplinePathData, PlacedTile } from "../types/CourseSchema";
import { fitTilesToSpline } from "./DiscreteKitFitter";
import { resolveOrderedTileChain } from "./SplineTrackSync";

describe("DiscreteKitFitter Beam Search Solver", () => {
  let mockLoader: AssetLoader;

  beforeAll(() => {
    const manifest: KitManifest = JSON.parse(
      fs.readFileSync(path.resolve("static/models/kit/manifest.json"), "utf-8")
    );
    const map = new Map<string, ParsedKitPiece>();
    for (const [id, meta] of Object.entries(manifest.pieces)) {
      map.set(id, {
        metadata: meta,
        visualTemplate: new THREE.Group(),
        ubxFloorGeometry: null,
        ubxWallLGeometry: null,
        ubxWallRGeometry: null,
        ubxWallBackGeometry: null,
        ubxColliderGeometries: [],
        sockets: meta.sockets,
        locators: new Map(),
      });
    }
    mockLoader = {
      getPiece: (id: string) => map.get(id),
      getManifest: () => manifest,
    } as unknown as AssetLoader;
  });

  function assertWatertightChain(tiles: PlacedTile[]) {
    const resolved = resolveOrderedTileChain(tiles, mockLoader);
    expect(resolved.length).toBe(tiles.length);
    for (let i = 0; i < resolved.length - 1; i++) {
      const a = resolved[i];
      const b = resolved[i + 1];
      const bEntrySock =
        b.template.sockets.find((s) => s.id === b.entrySocketId) || b.template.sockets[0];
      const bEntryWorld = new THREE.Vector3(...bEntrySock.position).applyMatrix4(b.worldMatrix);
      expect(a.exitPosition.distanceTo(bEntryWorld)).toBeLessThan(0.005);
    }
  }

  it("fits a curved Carnival right-to-left S-bend using 15/30/45/60/75/90 turns with zero seams", () => {
    const spline: SplinePathData = {
      nodes: [
        { id: "n0", position: [0, 0, 0], handleOffset: [0, -4], elevationStep: 0 },
        { id: "n1", position: [12, 0, -24], handleOffset: [0, -4], elevationStep: 0 },
        { id: "n2", position: [4, 0, -46], handleOffset: [0, -3], elevationStep: 0 },
      ],
    };

    const existing: PlacedTile[] = [
      { instanceId: "tee", kitPieceId: "carnival_tee_6x6", position: [0, 0, 0], rotationY: 0, walls: { left: true, right: true } },
      { instanceId: "cup", kitPieceId: "carnival_green_cup_6x6", walls: { left: true, right: true } },
    ];

    const result = fitTilesToSpline(spline, existing, "carnival_park", mockLoader);
    expect(result.tiles.length).toBeGreaterThanOrEqual(6);
    expect(result.tiles[0].kitPieceId).toBe("carnival_tee_6x6");
    expect(result.tiles[result.tiles.length - 1].kitPieceId).toBe("carnival_green_cup_6x6");

    // Verify reversed socket attachment occurred for left-bending turns
    const usesLeftTurn = result.tiles.some((t) => t.attachedTo?.childSocketId === "LOC_Socket_Out");
    expect(usesLeftTurn).toBe(true);
    assertWatertightChain(result.tiles);
  });

  it("inserts matching uphill/downhill ramps when spline node elevationStep climbs and descends", () => {
    const spline: SplinePathData = {
      nodes: [
        { id: "n0", position: [0, 0, 0], handleOffset: [0, -3], elevationStep: 0 },
        { id: "n1", position: [0, 1.5, -18], handleOffset: [0, -3], elevationStep: 1 },
        { id: "n2", position: [0, 0, -36], handleOffset: [0, -3], elevationStep: 0 },
      ],
    };

    const existing: PlacedTile[] = [
      { instanceId: "tee", kitPieceId: "carnival_tee_6x6", position: [0, 0, 0], rotationY: 0, walls: { left: true, right: true } },
      { instanceId: "cup", kitPieceId: "carnival_green_cup_6x6", walls: { left: true, right: true } },
    ];

    const result = fitTilesToSpline(spline, existing, "carnival_park", mockLoader);
    const ids = result.tiles.map((t) => t.kitPieceId);
    expect(ids).toContain("carnival_ramp_up_15deg_6x6");
    expect(ids).toContain("carnival_ramp_down_15deg_6x6");
    assertWatertightChain(result.tiles);
    expect(result.snappedNodes[result.snappedNodes.length - 1].elevationStep).toBe(0);
  });

  it("preserves pinned mid-course hero modules (bridge / windmill / hazards) during spline refit", () => {
    const spline: SplinePathData = {
      nodes: [
        { id: "n0", position: [0, 0, 0], handleOffset: [0, -4], elevationStep: 0 },
        { id: "n1", position: [8, 0, -36], handleOffset: [2, -3], elevationStep: 0 },
      ],
    };

    const existing: PlacedTile[] = [
      { instanceId: "tee", kitPieceId: "carnival_tee_6x6", position: [0, 0, 0], rotationY: 0, walls: { left: true, right: true }, connectedSockets: { LOC_Socket_Out: "s1" } },
      { instanceId: "s1", kitPieceId: "carnival_straight_6m", attachedTo: { parentInstanceId: "tee", parentSocketId: "LOC_Socket_Out" }, walls: { left: true, right: true }, connectedSockets: { LOC_Socket_Out: "bridge_hero" } },
      { instanceId: "bridge_hero", kitPieceId: "carnival_bridge_pond_6x12", attachedTo: { parentInstanceId: "s1", parentSocketId: "LOC_Socket_Out" }, walls: { left: false, right: false }, connectedSockets: { LOC_Socket_Out: "cup" } },
      { instanceId: "cup", kitPieceId: "carnival_green_cup_6x6", attachedTo: { parentInstanceId: "bridge_hero", parentSocketId: "LOC_Socket_Out" }, walls: { left: true, right: true } },
    ];

    const result = fitTilesToSpline(spline, existing, "carnival_park", mockLoader);
    const heroTile = result.tiles.find((t) => t.instanceId === "bridge_hero");
    expect(heroTile).toBeDefined();
    expect(heroTile!.kitPieceId).toBe("carnival_bridge_pond_6x12");
    expect(heroTile!.walls).toEqual({ left: false, right: false });
    assertWatertightChain(result.tiles);
  });

  it("preserves isGap open-air jump tiles when refitting spline path", () => {
    const spline: SplinePathData = {
      nodes: [
        { id: "n0", position: [0, 0, 0], handleOffset: [0, -4], elevationStep: 0 },
        { id: "n1", position: [0, 0, -30], handleOffset: [0, -3], elevationStep: 0 },
      ],
    };

    const existing: PlacedTile[] = [
      { instanceId: "tee", kitPieceId: "carnival_tee_6x6", position: [0, 0, 0], rotationY: 0, walls: { left: true, right: true }, connectedSockets: { LOC_Socket_Out: "s1" } },
      { instanceId: "s1", kitPieceId: "carnival_straight_6m", attachedTo: { parentInstanceId: "tee", parentSocketId: "LOC_Socket_Out" }, walls: { left: true, right: true }, connectedSockets: { LOC_Socket_Out: "gap_1" } },
      { instanceId: "gap_1", kitPieceId: "carnival_straight_6m", isGap: true, attachedTo: { parentInstanceId: "s1", parentSocketId: "LOC_Socket_Out" }, walls: { left: true, right: true }, connectedSockets: { LOC_Socket_Out: "cup" } },
      { instanceId: "cup", kitPieceId: "carnival_green_cup_6x6", attachedTo: { parentInstanceId: "gap_1", parentSocketId: "LOC_Socket_Out" }, walls: { left: true, right: true } },
    ];

    const result = fitTilesToSpline(spline, existing, "carnival_park", mockLoader);
    const gapTile = result.tiles.find((t) => t.instanceId === "gap_1");
    expect(gapTile).toBeDefined();
    expect(gapTile!.isGap).toBe(true);
    assertWatertightChain(result.tiles);
  });

  it("fits straight legs + Classic _crisp sharp turns when bevelRadius=0, and wide _rounded arc when beveled", () => {
    const existing: PlacedTile[] = [
      { instanceId: "tee", kitPieceId: "tee_box_6x6", position: [0, 0, 0], rotationY: 0, walls: { left: true, right: true } },
      { instanceId: "cup", kitPieceId: "green_cup_standard_6x6", walls: { left: true, right: true } },
    ];

    // 1. Sharp 90° corner (bevelRadius = 0)
    const sharpPath: SplinePathData = {
      nodes: [
        { id: "n0", position: [0, 0, 0], handleOffset: [0, -3], elevationStep: 0 },
        { id: "n1", position: [0, 0, -18], handleOffset: [0, -3], elevationStep: 0, bevelRadius: 0 },
        { id: "n2", position: [18, 0, -18], handleOffset: [3, 0], elevationStep: 0 },
      ],
    };
    const sharpRes = fitTilesToSpline(sharpPath, existing, "country_club", mockLoader);
    expect(sharpRes.tiles.some((t) => t.kitPieceId === "straight_6m")).toBe(true);
    expect(sharpRes.tiles.some((t) => t.kitPieceId === "turn_90deg_crisp")).toBe(true);
    assertWatertightChain(sharpRes.tiles);

    // 2. Wide beveled corner (bevelRadius = 12m on 24x24 legs) -> uses _rounded arc pieces
    const bevelPath: SplinePathData = {
      nodes: [
        { id: "n0", position: [0, 0, 0], handleOffset: [0, -3], elevationStep: 0 },
        { id: "n1", position: [0, 0, -24], handleOffset: [0, -3], elevationStep: 0, bevelRadius: 12 },
        { id: "n2", position: [24, 0, -24], handleOffset: [3, 0], elevationStep: 0 },
      ],
    };
    const bevelRes = fitTilesToSpline(bevelPath, existing, "country_club", mockLoader);
    expect(bevelRes.tiles.some((t) => t.kitPieceId.endsWith("_rounded"))).toBe(true);
    assertWatertightChain(bevelRes.tiles);
  });

  it("keeps authored path points untouched and builds greatest valid prefix while flagging invalid nodes", () => {
    const existing: PlacedTile[] = [
      { instanceId: "tee", kitPieceId: "carnival_tee_6x6", position: [0, 0, 0], rotationY: 0, walls: { left: true, right: true } },
      { instanceId: "cup", kitPieceId: "carnival_green_cup_6x6", walls: { left: true, right: true } },
    ];

    // 1. Track follows authored endpoint [0, 0, -16] without overwriting user waypoint coordinate
    const customLen: SplinePathData = {
      nodes: [
        { id: "n0", position: [0, 0, 0], handleOffset: [0, -3], elevationStep: 0 },
        { id: "n1", position: [0, 0, -16], handleOffset: [0, -3], elevationStep: 0 },
      ],
    };
    const fitCustom = fitTilesToSpline(customLen, existing, "carnival_park", mockLoader);
    expect(fitCustom.invalidNodeIndices).toEqual([]);
    expect(fitCustom.lastValidNodeIndex).toBe(1);
    expect(fitCustom.snappedNodes[1].position).toEqual([0, 0, -16]);
    assertWatertightChain(fitCustom.tiles);

    // 2. Impossible +3.0m climb over 3m after Mid marks trailing node(s) invalid and builds track up to valid prefix
    const partialPath: SplinePathData = {
      nodes: [
        { id: "n0", position: [0, 0, 0], handleOffset: [0, -3], elevationStep: 0 },
        { id: "n1", position: [0, 0, -18], handleOffset: [0, -3], elevationStep: 0 },
        { id: "n2", position: [0, 3.0, -21], handleOffset: [0, -3], elevationStep: 2 },
        { id: "n3", position: [0, 3.0, -33], handleOffset: [0, -3], elevationStep: 2 },
      ],
    };
    const partialFit = fitTilesToSpline(partialPath, existing, "carnival_park", mockLoader);
    expect(partialFit.lastValidNodeIndex).toBe(1);
    expect(partialFit.invalidNodeIndices).toEqual([2, 3]);
    // Authored path points remain exact where placed
    expect(partialFit.snappedNodes[2].position).toEqual([0, 3.0, -21]);
    expect(partialFit.snappedNodes[3].position).toEqual([0, 3.0, -33]);
    // Valid playable track (Tee -> Straights -> Cup) built up to last valid prefix
    expect(partialFit.tiles[partialFit.tiles.length - 1].kitPieceId).toBe("carnival_green_cup_6x6");
    assertWatertightChain(partialFit.tiles);
  });
});
