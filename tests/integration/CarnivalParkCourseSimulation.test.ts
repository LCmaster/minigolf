import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { carnivalParkCourse } from "../../src/lib/courses/carnivalParkCourse";
import { CourseManager } from "../../src/lib/engine/course/CourseManager";
import { BallController } from "../../src/lib/engine/player/BallController";
import { HoleGenerator } from "../../src/lib/engine/wfc/HoleGenerator";
import { PhysicsTestHarness } from "../helpers/PhysicsTestHarness";
import type { AssetLoader, ParsedKitPiece } from "../../src/lib/engine/kitbash/AssetLoader";
import type { KitManifest, SocketDefinition } from "../../src/lib/engine/types/KitTypes";

describe("Carnival Park Course Simulation (Sunny Creek & Midway Bend)", () => {
  let RAPIER: typeof import("@dimforge/rapier3d-compat");
  let mockAssetLoader: AssetLoader;

  beforeAll(async () => {
    RAPIER = await PhysicsTestHarness.getRapier();

    const manifestPath = path.resolve("static/models/kit/manifest.json");
    const manifest: KitManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const gltfLoader = new GLTFLoader();
    const piecesMap = new Map<string, ParsedKitPiece>();

    for (const [id, meta] of Object.entries(manifest.pieces)) {
      const fullPath = path.resolve("static", meta.glbPath);
      const buffer = fs.readFileSync(fullPath);
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );

      const gltfScene = await new Promise<THREE.Group>((resolve, reject) => {
        gltfLoader.parse(arrayBuffer, "", (g) => resolve(g.scene), reject);
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
          const m = child.clone();
          m.name = cleanName;
          visualGroup.add(m);
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
          const metaSocket = meta.sockets.find((s) => s.id === cleanName || s.id === child.name);
          if (metaSocket) {
            sockets.push(metaSocket);
          }
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

  it("loads Sunny Creek & Midway Bend with aligned socket elevations, props, and physics roll", () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const scene = new THREE.Scene();
    const cm = new CourseManager(scene, world, RAPIER, mockAssetLoader);
    const ball = new BallController(scene, world, RAPIER);

    const hole = carnivalParkCourse.holes[0];
    cm.loadHole(hole);

    // 1. Verify all 6 track tiles and all 21 props loaded
    expect(cm.getAllTiles().length).toBe(6);
    expect(cm.getAllProps().length).toBe(hole.props.length);

    // 2. Verify elevated tee (Y=1.5) and elevated green (Y=1.5) via SocketSolver alignment
    expect(cm.spawnPosition.y).toBeGreaterThan(1.5);
    expect(cm.goalPosition).not.toBeNull();
    expect(cm.goalPosition!.y).toBeCloseTo(1.5, 2);
    expect(cm.goalPosition!.x).toBeCloseTo(27.0, 1);

    // 3. Spawn ball at tee and putt downhill along -Z toward the downhill ramp & curve
    ball.createPhysicsBody(cm.spawnPosition);
    ball.shoot(new THREE.Vector3(0, 0, -0.055));

    for (let i = 0; i < 240; i++) {
      world.step();
      ball.update();
    }

    // Ball must roll smoothly down the ramp onto the lower valley (Y ~ 0.10) without falling out of bounds
    const pos = ball.getPosition();
    expect(pos.y).toBeGreaterThan(-0.15);
    expect(pos.y).toBeLessThan(0.65);
    expect(pos.z).toBeLessThan(cm.spawnPosition.z - 6.0);

    ball.dispose();
    cm.clear();
    world.free();
  });

  it("generates a playable Carnival Park hole with bridges and auto-decorated props via HoleGenerator", () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const scene = new THREE.Scene();
    const cm = new CourseManager(scene, world, RAPIER, mockAssetLoader);
    const generator = new HoleGenerator(mockAssetLoader);

    const hole = generator.generateHole({
      par: 4,
      style: "elevation",
      includeObstacles: true,
      theme: "carnival_park",
    });

    const tileIds = hole.tiles.map((t) => t.kitPieceId);
    expect(tileIds).toContain("carnival_tee_6x6");
    expect(tileIds).toContain("carnival_bridge_pond_6x12");
    expect(tileIds).toContain("carnival_green_cup_6x6");
    expect(hole.props.length).toBeGreaterThan(5);

    cm.loadHole(hole);
    expect(cm.goalPosition).not.toBeNull();

    cm.clear();
    world.free();
  });
});
