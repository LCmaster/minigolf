import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CourseManager } from "../../src/lib/engine/course/CourseManager";
import { BallController } from "../../src/lib/engine/player/BallController";
import { ParkBackdrop } from "../../src/lib/engine/scene/ParkBackdrop";
import { PhysicsTestHarness } from "../helpers/PhysicsTestHarness";
import type { AssetLoader, ParsedKitPiece } from "../../src/lib/engine/kitbash/AssetLoader";
import type { KitManifest, SocketDefinition } from "../../src/lib/engine/types/KitTypes";

describe("Terrain Colliders, Cup Bottom Indicator & Immediate Ball Sink", () => {
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
      "carnival_green_cup_6x6",
      "terrain_hill_knoll_6x6",
      "terrain_pond_patch_6x6",
      "terrain_waterfall_lagoon_12x12",
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

  it("seats cup flag indicator & sensor at bottom (-0.30m) and freezes ball without falling through terrain", () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const eventQueue = new RAPIER.EventQueue(true);
    const scene = new THREE.Scene();
    const cm = new CourseManager(scene, world, RAPIER, mockAssetLoader);
    const backdrop = new ParkBackdrop(scene);

    cm.onHoleChanged = () => {
      backdrop.updateFromCourse(cm);
      cm.updateTerrainCollider(backdrop.getGroundGeometry(), backdrop.getGroundWorldMatrix());
    };

    cm.loadHole({
      holeNumber: 1,
      par: 2,
      teeTileId: "t1",
      cupTileId: "t2",
      tiles: [
        { instanceId: "t1", kitPieceId: "carnival_tee_6x6", position: [0, 0, 0], rotationY: 0, walls: { left: true, right: true } },
        { instanceId: "t2", kitPieceId: "carnival_green_cup_6x6", attachedTo: { parentInstanceId: "t1", parentSocketId: "LOC_Socket_Out" }, walls: { left: true, right: true } },
      ],
    });

    const rimPos = cm.getGoalPosition()!;
    const cupBottomPos = cm.getCupBottomPosition()!;
    expect(rimPos.y).toBeCloseTo(0.0, 2);
    expect(cupBottomPos.y).toBeCloseTo(-0.30, 2);
    expect(cm.getCupBottomCollider()).not.toBeNull();
    expect(cm.getTerrainCollider()).not.toBeNull();

    // Verify flagpole sprite is anchored with base directly at cup bottom Y
    const flag = scene.children.find((c) => c instanceof THREE.Sprite) as THREE.Sprite;
    expect(flag).toBeDefined();
    expect(flag.position.y).toBeCloseTo(cupBottomPos.y, 2);
    expect(flag.center.y).toBe(0);

    // Ball dropped directly over cup cavity stops immediately at bottom on sink and never falls through
    const ball = new BallController(scene, world, RAPIER);
    ball.createPhysicsBody(new THREE.Vector3(cupBottomPos.x, 0.25, cupBottomPos.z));

    const goalHandle = cm.getGoalSensorCollider()!.handle;
    const ballHandle = ball.collider.handle;
    let sank = false;

    for (let i = 0; i < 120; i++) {
      world.step(eventQueue);
      ball.update();
      eventQueue.drainCollisionEvents((h1, h2, started) => {
        if (started && ((h1 === goalHandle && h2 === ballHandle) || (h2 === goalHandle && h1 === ballHandle))) {
          sank = true;
        }
      });
      if (sank && ball.state !== "in_hole") {
        ball.sinkAt(new THREE.Vector3(cupBottomPos.x, cupBottomPos.y + ball.radius, cupBottomPos.z));
      }
    }

    expect(sank).toBe(true);
    expect(ball.state).toBe("in_hole");
    expect(ball.getPosition().y).toBeCloseTo(cupBottomPos.y + ball.radius, 2);
    const v = ball.rigidBody.linvel();
    expect(Math.hypot(v.x, v.y, v.z)).toBe(0);

    // Restoring dynamic physics on respawn/reset works cleanly
    ball.createPhysicsBody(new THREE.Vector3(0, 0.15, 0));
    expect(ball.state).toBe("aiming");
    expect(ball.rigidBody.bodyType()).toBe(RAPIER.RigidBodyType.Dynamic);
  });

  it("blocks golf balls cleanly on ParkBackdrop terrain and modular terrain_* props (non-traversable)", () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const scene = new THREE.Scene();
    const cm = new CourseManager(scene, world, RAPIER, mockAssetLoader);
    const backdrop = new ParkBackdrop(scene);

    cm.onHoleChanged = () => {
      backdrop.updateFromCourse(cm);
      cm.updateTerrainCollider(backdrop.getGroundGeometry(), backdrop.getGroundWorldMatrix());
    };

    cm.loadHole({
      holeNumber: 1,
      par: 2,
      teeTileId: "t1",
      cupTileId: "t1",
      tiles: [
        { instanceId: "t1", kitPieceId: "carnival_tee_6x6", position: [0, 0, 0], rotationY: 0, walls: { left: true, right: true } },
      ],
      props: [
        { instanceId: "p_hill", propId: "terrain_hill_knoll_6x6", position: [12, -0.08, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        { instanceId: "p_pond", propId: "terrain_pond_patch_6x6", position: [-12, -0.08, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        { instanceId: "p_lagoon", propId: "terrain_waterfall_lagoon_12x12", position: [0, -0.08, -18], rotation: [0, 0, 0], scale: [1, 1, 1] },
      ],
    });

    // Placed terrain props all have solid Rapier colliders
    for (const propInst of cm.getAllProps()) {
      expect(propInst.colliders.length).toBeGreaterThan(0);
    }

    // 1. Ball dropped off-track onto ParkBackdrop grass stops cleanly on ground instead of falling to -5.0
    const lawnBall = new BallController(scene, world, RAPIER);
    lawnBall.createPhysicsBody(new THREE.Vector3(8, 1.0, 8));
    for (let i = 0; i < 180; i++) {
      world.step();
      lawnBall.update();
    }
    expect(lawnBall.state).not.toBe("out_of_bounds");
    expect(lawnBall.getPosition().y).toBeGreaterThan(-0.15);

    // 2. Ball dropped onto terrain_hill_knoll_6x6 lands elevated on the hill surface (not falling through)
    const hillBall = new BallController(scene, world, RAPIER);
    hillBall.createPhysicsBody(new THREE.Vector3(12, 2.5, 0));
    for (let i = 0; i < 120; i++) {
      world.step();
      hillBall.update();
    }
    expect(hillBall.state).not.toBe("out_of_bounds");
    expect(hillBall.getPosition().y).toBeGreaterThan(0.2);
  });
});
