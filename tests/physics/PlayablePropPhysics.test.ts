import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CourseManager } from "../../src/lib/engine/course/CourseManager";
import { BallController } from "../../src/lib/engine/player/BallController";
import { PhysicsTestHarness } from "../helpers/PhysicsTestHarness";
import type { AssetLoader, ParsedKitPiece } from "../../src/lib/engine/kitbash/AssetLoader";
import type { KitManifest, SocketDefinition } from "../../src/lib/engine/types/KitTypes";

describe("Playable Prop Physics (Booster Pad, Booster Strip & Wedge Bumper)", () => {
  let RAPIER: typeof import("@dimforge/rapier3d-compat");
  let mockAssetLoader: AssetLoader;
  let piecesMap: Map<string, ParsedKitPiece>;

  beforeAll(async () => {
    RAPIER = await PhysicsTestHarness.getRapier();
    const manifestPath = path.resolve("static/models/kit/manifest.json");
    const manifest: KitManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const gltfLoader = new GLTFLoader();
    piecesMap = new Map<string, ParsedKitPiece>();

    for (const id of [
      "carnival_tee_6x6",
      "carnival_straight_6m",
      "hazard_booster_strip_6x3",
      "prop_carnival_booster_pad",
      "prop_carnival_wedge_bumper",
    ]) {
      const meta = manifest.pieces[id];
      const buffer = fs.readFileSync(path.resolve("static", meta.glbPath));
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
        } else if (cleanName.startsWith("UBX_") && cleanName.includes("Sensor") && child instanceof THREE.Mesh) {
          ubxSensorGeo = child.geometry.clone();
          ubxSensorGeo.applyMatrix4(child.matrixWorld);
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
        ubxSensorGeometry: ubxSensorGeo,
        sockets: sockets.length > 0 ? sockets : meta.sockets,
        locators,
      });
    }

    mockAssetLoader = {
      getPiece: (id: string) => piecesMap.get(id),
      getManifest: () => manifest,
    } as unknown as AssetLoader;
  });

  function stepWithEvents(
    world: any,
    eventQueue: any,
    courseManager: CourseManager,
    ball: BallController,
    steps: number
  ) {
    let boosted = 0;
    let bumperHits = 0;
    let cooldown = 0;
    const dt = 1 / 60;

    for (let i = 0; i < steps; i++) {
      world.step(eventQueue);
      if (cooldown > 0) cooldown -= dt;
      ball.update();

      const ballHandle = ball.collider.handle;
      eventQueue.drainCollisionEvents((h1: number, h2: number, started: boolean) => {
        if (!started) return;
        if (h1 !== ballHandle && h2 !== ballHandle) return;
        const other = h1 === ballHandle ? h2 : h1;
        const booster = courseManager.getBoosterSensor(other);
        if (booster && cooldown <= 0) {
          ball.rigidBody.applyImpulse(
            new RAPIER.Vector3(
              booster.direction.x * booster.impulse,
              booster.direction.y * booster.impulse,
              booster.direction.z * booster.impulse
            ),
            true
          );
          cooldown = 0.35;
          boosted++;
        }
        if (courseManager.isBumperCollider(other)) {
          bumperHits++;
        }
      });
    }
    return { boosted, bumperHits };
  }

  it("extracts UBX_Booster_Sensor as a non-solid sensor and accelerates a rolling ball forward", () => {
    const boosterTemplate = piecesMap.get("prop_carnival_booster_pad")!;
    expect(boosterTemplate.ubxSensorGeometry).not.toBeNull();
    expect(boosterTemplate.ubxColliderGeometries.length).toBe(0);

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const eventQueue = new RAPIER.EventQueue(true);
    const scene = new THREE.Scene();
    const cm = new CourseManager(scene, world, RAPIER, mockAssetLoader);

    cm.loadHole({
      holeNumber: 1,
      par: 2,
      teeTileId: "t1",
      cupTileId: "t2",
      tiles: [
        { instanceId: "t1", kitPieceId: "carnival_tee_6x6", position: [0, 0, 0], walls: { left: true, right: true } },
        {
          instanceId: "t2",
          kitPieceId: "carnival_straight_6m",
          walls: { left: true, right: true },
          attachedTo: { parentInstanceId: "t1", parentSocketId: "LOC_Socket_Out", childSocketId: "LOC_Socket_In" },
        },
      ],
      props: [
        {
          instanceId: "p_boost",
          propId: "prop_carnival_booster_pad",
          position: [0, 0.0, -3.5],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
      ],
    });

    const ball = new BallController(scene, world, RAPIER);
    ball.createPhysicsBody(new THREE.Vector3(0, 0.15, -1.0));
    ball.shoot(new THREE.Vector3(0, 0, -0.012));

    const { boosted } = stepWithEvents(world, eventQueue, cm, ball, 90);
    expect(boosted).toBeGreaterThanOrEqual(1);
    expect(ball.getPosition().z).toBeLessThan(-6.0);
  });

  it("fires a booster impulse when crossing hazard_booster_strip_6x3 tile", () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const eventQueue = new RAPIER.EventQueue(true);
    const scene = new THREE.Scene();
    const cm = new CourseManager(scene, world, RAPIER, mockAssetLoader);

    cm.loadHole({
      holeNumber: 1,
      par: 2,
      teeTileId: "t1",
      cupTileId: "t2",
      tiles: [
        { instanceId: "t1", kitPieceId: "carnival_tee_6x6", position: [0, 0, 0], walls: { left: true, right: true } },
        {
          instanceId: "t2",
          kitPieceId: "hazard_booster_strip_6x3",
          walls: { left: true, right: true },
          attachedTo: { parentInstanceId: "t1", parentSocketId: "LOC_Socket_Out", childSocketId: "LOC_Socket_In" },
        },
      ],
    });

    const ball = new BallController(scene, world, RAPIER);
    ball.createPhysicsBody(new THREE.Vector3(0, 0.15, -1.5));
    ball.shoot(new THREE.Vector3(0, 0, -0.02));

    const { boosted } = stepWithEvents(world, eventQueue, cm, ball, 90);
    expect(boosted).toBeGreaterThanOrEqual(1);
    expect(ball.getPosition().z).toBeLessThan(-6.0);
  });

  it("deflects off prop_carnival_wedge_bumper with high restitution bumper physics", () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const eventQueue = new RAPIER.EventQueue(true);
    const scene = new THREE.Scene();
    const cm = new CourseManager(scene, world, RAPIER, mockAssetLoader);

    cm.loadHole({
      holeNumber: 1,
      par: 2,
      teeTileId: "t1",
      cupTileId: "t1",
      tiles: [
        { instanceId: "t1", kitPieceId: "carnival_tee_6x6", position: [0, 0, 0], walls: { left: true, right: true } },
      ],
      props: [
        {
          instanceId: "p_wedge",
          propId: "prop_carnival_wedge_bumper",
          position: [0, 0.0, -1.8],
          rotation: [0, 35, 0],
          scale: [1, 1, 1],
        },
      ],
    });

    const ball = new BallController(scene, world, RAPIER);
    ball.createPhysicsBody(new THREE.Vector3(0, 0.15, 0.0));
    ball.shoot(new THREE.Vector3(0, 0, -0.03));

    const { bumperHits } = stepWithEvents(world, eventQueue, cm, ball, 90);
    expect(bumperHits).toBeGreaterThanOrEqual(1);
    const pos = ball.getPosition();
    // Angled 35deg wedge deflects ball laterally away from center X = 0
    expect(Math.abs(pos.x)).toBeGreaterThan(0.25);
  });
});
