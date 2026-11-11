import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import type { AssetLoader, ParsedKitPiece } from "../kitbash/AssetLoader";
import type { KitManifest } from "../types/KitTypes";
import { carnivalParkCourse } from "../../courses/carnivalParkCourse";
import { deriveSplineFromTiles, syncSplineAfterSocketChange } from "./SplineTrackSync";
import * as THREE from "three";

describe("SplineTrackSync Bidirectional Derivation", () => {
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

  it("derives an ordered SplinePathData chain from Carnival Park Hole 1 (Sunny Creek)", () => {
    const hole1 = carnivalParkCourse.holes[0];
    const spline = deriveSplineFromTiles(hole1, mockLoader);

    expect(spline.nodes.length).toBeGreaterThanOrEqual(4);
    // Hole 1 Tee sits at [0, 1.5, 6]
    expect(spline.nodes[0].position[0]).toBeCloseTo(0, 2);
    expect(spline.nodes[0].position[1]).toBeCloseTo(1.5, 2);
    expect(spline.nodes[0].position[2]).toBeCloseTo(6, 2);
    expect(spline.nodes[0].elevationStep).toBe(1);

    // End node terminates on Cup (+1.5m)
    const last = spline.nodes[spline.nodes.length - 1];
    expect(last.elevationStep).toBe(1);
    expect(last.realizedTileId).toBe("sc_cup");
  });

  it("updates spline tail smoothly when snapping additional tiles onto an open socket", () => {
    const startTiles = [
      {
        instanceId: "t0",
        kitPieceId: "carnival_tee_6x6",
        position: [0, 0, 0] as [number, number, number],
        rotationY: 0,
        walls: { left: true, right: true },
        connectedSockets: { LOC_Socket_Out: "t1" },
      },
      {
        instanceId: "t1",
        kitPieceId: "carnival_straight_6m",
        attachedTo: { parentInstanceId: "t0", parentSocketId: "LOC_Socket_Out", childSocketId: "LOC_Socket_In" },
        walls: { left: true, right: true },
        connectedSockets: { LOC_Socket_In: "t0" },
      },
    ];

    const initialSpline = deriveSplineFromTiles(startTiles, mockLoader);
    expect(initialSpline.nodes[initialSpline.nodes.length - 1].position[2]).toBeCloseTo(-9, 1);

    const extendedTiles = [
      {
        ...startTiles[0],
      },
      {
        ...startTiles[1],
        connectedSockets: { LOC_Socket_In: "t0", LOC_Socket_Out: "t2" },
      },
      {
        instanceId: "t2",
        kitPieceId: "carnival_turn_90deg_rounded",
        attachedTo: { parentInstanceId: "t1", parentSocketId: "LOC_Socket_Out", childSocketId: "LOC_Socket_In" },
        walls: { left: true, right: true },
        connectedSockets: { LOC_Socket_In: "t1" },
      },
    ];

    const synced = syncSplineAfterSocketChange(initialSpline, extendedTiles, mockLoader);
    const tail = synced.nodes[synced.nodes.length - 1];
    expect(tail.position[0]).toBeCloseTo(6, 1);
    expect(tail.position[2]).toBeCloseTo(-15, 1);
    expect(tail.realizedTileId).toBe("t2");
  });
});
