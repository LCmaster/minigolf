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
      let ubxSensorGeo: THREE.BufferGeometry | null = null;
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
        } else if (cleanName.includes("Sensor") && cleanName.startsWith("UBX_") && child instanceof THREE.Mesh) {
          ubxSensorGeo = child.geometry.clone();
          ubxSensorGeo.applyMatrix4(child.matrixWorld);
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
        ubxSensorGeometry: ubxSensorGeo,
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

  it("loads Hole 2 (Big Top Windmill & Waterfall Lagoon) with horseshoe socket alignment, windmill tunnel, and uphill roll", () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const scene = new THREE.Scene();
    const cm = new CourseManager(scene, world, RAPIER, mockAssetLoader);
    const ball = new BallController(scene, world, RAPIER);

    const hole2 = carnivalParkCourse.holes[1];
    cm.loadHole(hole2);

    expect(cm.getAllTiles().length).toBe(8);
    expect(cm.getAllProps().length).toBe(hole2.props.length);

    // Tee at Y=0.0, Windmill ridge at Y=1.5, Cup green back at front-right [30, 0, 6]
    expect(cm.spawnPosition.y).toBeGreaterThan(0.0);
    expect(cm.spawnPosition.y).toBeLessThan(0.5);
    expect(cm.goalPosition).not.toBeNull();
    expect(cm.goalPosition!.y).toBeCloseTo(0.0, 2);
    expect(cm.goalPosition!.x).toBeCloseTo(30.0, 1);
    expect(cm.goalPosition!.z).toBeCloseTo(6.0, 1);

    // Putt uphill along -Z up the 15deg ramp onto the elevated ridge (Y = 1.5m)
    ball.createPhysicsBody(cm.spawnPosition);
    ball.shoot(new THREE.Vector3(0, 0, -0.068));

    for (let i = 0; i < 160; i++) {
      world.step();
      ball.update();
    }

    const pos = ball.getPosition();
    expect(pos.y).toBeGreaterThan(1.3);
    expect(pos.z).toBeLessThan(-2.0);

    ball.dispose();
    cm.clear();
    world.free();
  });

  it("provides a complete 9-hole stylized Carnival Park course with valid socket chains, zero self-overlaps, new signature assets, and playable roll on every hole", () => {
    expect(carnivalParkCourse.holes).toHaveLength(9);

    const usedTiles = new Set<string>();
    const usedProps = new Set<string>();

    for (let idx = 0; idx < carnivalParkCourse.holes.length; idx++) {
      const hole = carnivalParkCourse.holes[idx];
      expect(hole.holeNumber).toBe(idx + 1);
      expect(hole.par).toBeGreaterThanOrEqual(3);
      expect(hole.tiles.length).toBeGreaterThanOrEqual(4);

      for (const t of hole.tiles) usedTiles.add(t.kitPieceId);
      for (const p of hole.props) usedProps.add(p.propId);

      const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      const scene = new THREE.Scene();
      const cm = new CourseManager(scene, world, RAPIER, mockAssetLoader);
      const ball = new BallController(scene, world, RAPIER);

      cm.loadHole(hole);
      const placedTiles = cm.getAllTiles();
      expect(placedTiles.length).toBe(hole.tiles.length);
      expect(cm.getAllProps().length).toBe(hole.props.length);
      expect(cm.goalPosition).not.toBeNull();
      expect(cm.getGoalSensorCollider()).not.toBeNull();

      // Verify no non-adjacent tile centers overlap at the same elevation
      for (let i = 0; i < placedTiles.length; i++) {
        for (let j = i + 2; j < placedTiles.length; j++) {
          const a = placedTiles[i].group.position;
          const b = placedTiles[j].group.position;
          const horizDist = Math.hypot(a.x - b.x, a.z - b.z);
          if (Math.abs(a.y - b.y) < 0.8) {
            expect(horizDist).toBeGreaterThan(4.2);
          }
        }
      }

      // Forward putt from tee should roll along -Z and stay cleanly supported on the course
      ball.createPhysicsBody(cm.spawnPosition);
      ball.shoot(new THREE.Vector3(0, 0, -0.05));
      for (let s = 0; s < 120; s++) {
        world.step();
        ball.update();
      }
      const pos = ball.getPosition();
      expect(pos.z).toBeLessThan(cm.spawnPosition.z - 2.0);
      expect(pos.y).toBeGreaterThan(-0.5);

      ball.dispose();
      cm.clear();
      world.free();
    }

    expect(usedTiles.has("carnival_split_lane_6x12")).toBe(true);
    expect(usedTiles.has("carnival_tunnel_6x6")).toBe(true);
    expect(usedProps.has("prop_carnival_hoop_6m")).toBe(true);
    expect(usedProps.has("prop_carnival_tent_pavilion")).toBe(true);
    expect(usedProps.has("prop_bumper_star_pink")).toBe(true);
  });

  it("simulates Hole 3 Carousel Split deflection and Hole 4 Sky-Hoop boosted aerial jump over the 6m gap", () => {
    // 1. Hole 4: booster pad + ramp jump clears the 6m gap under prop_carnival_hoop_6m to Y=1.5m landing
    {
      const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      const scene = new THREE.Scene();
      const cm = new CourseManager(scene, world, RAPIER, mockAssetLoader);
      const ball = new BallController(scene, world, RAPIER);
      const eventQueue = new RAPIER.EventQueue(true);

      cm.loadHole(carnivalParkCourse.holes[3]); // Hole 4
      ball.createPhysicsBody(cm.spawnPosition);
      ball.shoot(new THREE.Vector3(0, 0, -0.145));

      let boosted = false;
      for (let s = 0; s < 320; s++) {
        world.step(eventQueue);
        eventQueue.drainCollisionEvents((h1, h2, started) => {
          if (!started) return;
          const b1 = cm.getBoosterSensor(h1);
          const b2 = cm.getBoosterSensor(h2);
          const info = b1 || b2;
          if (info && !boosted) {
            boosted = true;
            ball.applyImpulse(info.direction.clone().multiplyScalar(info.impulse));
          }
        });
        ball.update();
      }

      expect(boosted).toBe(true);
      const finalPos = ball.getPosition();
      // Landed beyond the Z=-15..Z=-9 gap cleanly onto the lower green deck (Z < -15, Y ~ 0.08)
      expect(finalPos.z).toBeLessThan(-15.0);
      expect(finalPos.y).toBeGreaterThan(-0.05);
      expect(finalPos.y).toBeLessThan(0.6);

      eventQueue.free();
      ball.dispose();
      cm.clear();
      world.free();
    }

    // 2. Hole 3: angled bank shot passes through Funhouse Tunnel and deflects past Carousel Split island
    {
      const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
      const scene = new THREE.Scene();
      const cm = new CourseManager(scene, world, RAPIER, mockAssetLoader);
      const ball = new BallController(scene, world, RAPIER);

      cm.loadHole(carnivalParkCourse.holes[2]); // Hole 3
      ball.createPhysicsBody(cm.spawnPosition);
      ball.shoot(new THREE.Vector3(0.018, 0, -0.105));

      for (let s = 0; s < 280; s++) {
        world.step();
        ball.update();
      }

      const pos = ball.getPosition();
      expect(pos.y).toBeGreaterThan(-0.1);
      expect(pos.y).toBeLessThan(0.5);
      // Cleared tunnel (Z=0) and past carousel split island center (Z=-9 -> Z < -12)
      expect(pos.z).toBeLessThan(-12.0);

      ball.dispose();
      cm.clear();
      world.free();
    }
  });
});
