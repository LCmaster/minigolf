import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CourseManager } from "../../src/lib/engine/course/CourseManager";
import { BallController } from "../../src/lib/engine/player/BallController";
import { PhysicsTestHarness } from "../helpers/PhysicsTestHarness";
import { fitTilesToSpline } from "../../src/lib/engine/spline/DiscreteKitFitter";
import type { AssetLoader, ParsedKitPiece } from "../../src/lib/engine/kitbash/AssetLoader";
import type { KitManifest, SocketDefinition } from "../../src/lib/engine/types/KitTypes";
import type { SplinePathData, PlacedTile } from "../../src/lib/engine/types/CourseSchema";

describe("Spline Track Physics Verification (Real Carnival Curves & Welded Seams)", () => {
  let RAPIER: typeof import("@dimforge/rapier3d-compat");
  let mockAssetLoader: AssetLoader;

  beforeAll(async () => {
    RAPIER = await PhysicsTestHarness.getRapier();
    const manifest: KitManifest = JSON.parse(
      fs.readFileSync(path.resolve("static/models/kit/manifest.json"), "utf-8")
    );
    const gltfLoader = new GLTFLoader();
    const piecesMap = new Map<string, ParsedKitPiece>();

    for (const id of [
      "carnival_tee_6x6",
      "carnival_straight_6m",
      "carnival_turn_15deg_rounded",
      "carnival_turn_30deg_rounded",
      "carnival_turn_45deg_rounded",
      "carnival_turn_60deg_rounded",
      "carnival_turn_75deg_rounded",
      "carnival_turn_90deg_rounded",
      "carnival_ramp_up_15deg_6x6",
      "carnival_ramp_down_15deg_6x6",
      "carnival_green_cup_6x6",
    ]) {
      const meta = manifest.pieces[id];
      const buf = fs.readFileSync(path.resolve("static", meta.glbPath));
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const gltfScene = await new Promise<THREE.Group>((resolve, reject) => {
        gltfLoader.parse(ab, "", (g) => resolve(g.scene), reject);
      });

      const visualGroup = new THREE.Group();
      let ubxFloorGeo: THREE.BufferGeometry | null = null;
      let ubxWallLGeo: THREE.BufferGeometry | null = null;
      let ubxWallRGeo: THREE.BufferGeometry | null = null;
      let ubxWallBackGeo: THREE.BufferGeometry | null = null;
      const ubxColliderGeos: THREE.BufferGeometry[] = [];
      const locators = new Map<string, THREE.Vector3>();
      const sockets: SocketDefinition[] = [];

      gltfScene.updateMatrixWorld(true);
      gltfScene.traverse((child) => {
        const cleanName = child.name.replace(/(?:\.\d+|\d{3})+$/, "");
        if (cleanName.startsWith("Mesh_") && child instanceof THREE.Mesh) {
          visualGroup.add(child.clone());
        } else if (cleanName === "UBX_Floor" && child instanceof THREE.Mesh) {
          ubxFloorGeo = child.geometry.clone();
          ubxFloorGeo.applyMatrix4(child.matrixWorld);
        } else if (cleanName === "UBX_Wall_L" && child instanceof THREE.Mesh) {
          ubxWallLGeo = child.geometry.clone();
          ubxWallLGeo.applyMatrix4(child.matrixWorld);
        } else if (cleanName === "UBX_Wall_R" && child instanceof THREE.Mesh) {
          ubxWallRGeo = child.geometry.clone();
          ubxWallRGeo.applyMatrix4(child.matrixWorld);
        } else if ((cleanName === "UBX_Wall_Back" || cleanName === "UBX_Wall_B") && child instanceof THREE.Mesh) {
          ubxWallBackGeo = child.geometry.clone();
          ubxWallBackGeo.applyMatrix4(child.matrixWorld);
        } else if (cleanName.startsWith("UBX_") && child instanceof THREE.Mesh) {
          const g = child.geometry.clone();
          g.applyMatrix4(child.matrixWorld);
          ubxColliderGeos.push(g);
        } else if (cleanName.startsWith("LOC_Socket_")) {
          const ms = meta.sockets.find((s) => s.id === cleanName || s.id === child.name);
          if (ms) sockets.push(ms);
          locators.set(cleanName, child.position.clone());
        } else if (cleanName.startsWith("LOC_")) {
          locators.set(cleanName, child.position.clone());
        }
      });

      piecesMap.set(id, {
        metadata: meta,
        visualTemplate: visualGroup,
        ubxFloorGeometry: ubxFloorGeo,
        ubxWallLGeometry: ubxWallLGeo,
        ubxWallRGeometry: ubxWallRGeo,
        ubxWallBackGeometry: ubxWallBackGeo,
        ubxColliderGeometries: ubxColliderGeos,
        sockets: sockets.length > 0 ? sockets : meta.sockets,
        locators,
      });
    }

    mockAssetLoader = {
      getPiece: (id: string) => piecesMap.get(id),
      getManifest: () => manifest,
    } as unknown as AssetLoader;
  });

  it("rolls a golf ball smoothly across spline-fitted Carnival 15/30deg curves and welded ramps with zero bounce spikes", () => {
    const spline: SplinePathData = {
      nodes: [
        { id: "n0", position: [0, 0, 0], handleOffset: [0, -3], elevationStep: 0 },
        { id: "n1", position: [3, 0, -18], handleOffset: [0, -3], elevationStep: 0 },
        { id: "n2", position: [0, 1.5, -36], handleOffset: [0, -3], elevationStep: 1 },
      ],
    };

    const existing: PlacedTile[] = [
      { instanceId: "tee_0", kitPieceId: "carnival_tee_6x6", position: [0, 0, 0], rotationY: 0, walls: { left: true, right: true } },
      { instanceId: "cup_0", kitPieceId: "carnival_green_cup_6x6", walls: { left: true, right: true } },
    ];

    const fit = fitTilesToSpline(spline, existing, "carnival_park", mockAssetLoader);
    expect(fit.tiles.length).toBeGreaterThanOrEqual(5);

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const scene = new THREE.Scene();
    const cm = new CourseManager(scene, world, RAPIER, mockAssetLoader);
    cm.loadHole({
      holeNumber: 1,
      par: 3,
      teeTileId: fit.tiles[0].instanceId,
      cupTileId: fit.tiles[fit.tiles.length - 1].instanceId,
      tiles: fit.tiles,
      props: [],
      splinePath: { closed: false, nodes: fit.snappedNodes },
    });

    const ball = new BallController(scene, world, RAPIER);
    ball.createPhysicsBody(new THREE.Vector3(cm.spawnPosition.x, cm.spawnPosition.y + 0.1, cm.spawnPosition.z));
    ball.shoot(new THREE.Vector3(0, 0, -0.055));

    let maxPosYSpike = 0;
    let minZReached = 0;
    for (let i = 0; i < 200; i++) {
      world.step();
      ball.update();
      const vy = ball.rigidBody.linvel().y;
      if (vy > maxPosYSpike) maxPosYSpike = vy;
      const bz = ball.getPosition().z;
      if (bz < minZReached) minZReached = bz;
    }

    // Smooth roll across welded curve seams & 15deg ramp without ghost-seam launches
    expect(ball.state).not.toBe("out_of_bounds");
    expect(maxPosYSpike).toBeLessThan(3.5);
    expect(minZReached).toBeLessThan(-10.0);
  });
});
