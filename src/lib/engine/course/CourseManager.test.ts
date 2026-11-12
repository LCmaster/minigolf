import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { SocketSolver } from "./SocketSolver";
import type { SocketDefinition } from "../types/KitTypes";

describe("CourseManager Dynamic Socket Snapping (TDD)", () => {
  it("computes seamless continuous chain for S-Curve Meadow (Hole 2)", () => {
    // 1. Tee Box at origin
    let currentMatrix = new THREE.Matrix4().identity();
    const positions: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];

    // Socket standard for 6m straight/tee
    const socketOut6m: SocketDefinition = {
      id: "LOC_Socket_Out",
      position: [0, 0, -3.0],
      normal: [0, 0, -1],
      type: "track_arcade_6m",
      elevation: 0,
    };

    const socketIn6m: SocketDefinition = {
      id: "LOC_Socket_In",
      position: [0, 0, 3.0],
      normal: [0, 0, 1],
      type: "track_arcade_6m",
      elevation: 0,
    };

    // 2. Snap Straight 6m
    const straightMatrix = SocketSolver.computeSnappedTransform(currentMatrix, socketOut6m, socketIn6m);
    const p1 = new THREE.Vector3();
    straightMatrix.decompose(p1, new THREE.Quaternion(), new THREE.Vector3());
    positions.push(p1);

    expect(p1.z).toBeCloseTo(-6.0, 3);
    expect(p1.x).toBeCloseTo(0, 3);

    // 3. Snap next segment
    const turnMatrix = SocketSolver.computeSnappedTransform(straightMatrix, socketOut6m, socketIn6m);
    const p2 = new THREE.Vector3();
    turnMatrix.decompose(p2, new THREE.Quaternion(), new THREE.Vector3());
    positions.push(p2);

    expect(p2.z).toBeCloseTo(-12.0, 3);

    // In world space, straight exit and turn entrance match exactly
    const exitStraightWorld = new THREE.Vector3(0, 0, -3.0).applyMatrix4(straightMatrix);
    const inTurnWorld = new THREE.Vector3(0, 0, 3.0).applyMatrix4(turnMatrix);
    expect(exitStraightWorld.distanceTo(inTurnWorld)).toBeLessThan(1e-4);
  });

  it("CourseManager instantiates with attachedTo auto-alignment", async () => {
    const RAPIER = await import("@dimforge/rapier3d-compat");
    await RAPIER.init();

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const scene = new THREE.Scene();

    // Mock asset loader
    const mockLoader: any = {
      getPiece: (id: string) => ({
        metadata: { id },
        visualTemplate: new THREE.Group(),
        ubxFloorGeometry: new THREE.BoxGeometry(5.2, 0.1, 6.0),
        ubxWallLGeometry: new THREE.BoxGeometry(0.4, 0.6, 6.0),
        ubxWallRGeometry: new THREE.BoxGeometry(0.4, 0.6, 6.0),
        sockets: [
          {
            id: "LOC_Socket_In",
            position: [0, 0, 3.0],
            normal: [0, 0, 1],
            type: "track_arcade_6m",
            elevation: 0,
          },
          {
            id: "LOC_Socket_Out",
            position: [0, 0, -3.0],
            normal: [0, 0, -1],
            type: "track_arcade_6m",
            elevation: 0,
          },
        ],
        locators: new Map([
          ["LOC_Spawn_Tee", new THREE.Vector3(0, 0.2, 0)],
          ["LOC_Sensor_Goal", new THREE.Vector3(0, 0, 0)],
        ]),
      }),
    };

    const { CourseManager } = await import("./CourseManager");
    const cm = new CourseManager(scene, world, RAPIER, mockLoader);

    // 1. Add Tee
    const tee = cm.addTile({
      instanceId: "tee_1",
      kitPieceId: "tee_box_6x6",
      position: [0, 0, 0],
      rotationY: 0,
      walls: { left: true, right: true },
    });
    expect(tee).not.toBeNull();
    expect(cm.spawnPosition.y).toBeCloseTo(0.2, 2);

    // 2. Snap Straight tile via attachedTo
    const straight = cm.addTile({
      instanceId: "straight_1",
      kitPieceId: "straight_6m",
      walls: { left: true, right: true },
      attachedTo: {
        parentInstanceId: "tee_1",
        parentSocketId: "LOC_Socket_Out",
        childSocketId: "LOC_Socket_In",
      },
    });
    expect(straight).not.toBeNull();
    expect(straight!.group.position.z).toBeCloseTo(-6.0, 2);

    // 3. Wall toggle
    expect(cm.toggleWall("straight_1", "left")).toBe(false);
    expect(cm.toggleWall("straight_1", "left")).toBe(true);

    // 4. Goal sensor conforms to arcade cup specification (0.425m radius cylinder)
    const goalSensor = cm.getGoalSensorCollider();
    expect(goalSensor).not.toBeNull();
    expect(goalSensor!.shapeType()).toBe(RAPIER.ShapeType.Cylinder);
    expect(goalSensor!.radius()).toBeCloseTo(0.425, 2);
    expect(goalSensor!.halfHeight()).toBeCloseTo(0.025, 2);

    // 5. Cleanup removes visual meshes, cup indicators, and colliders
    cm.clear();
    expect(scene.children.length).toBe(0);
    expect(cm.getGoalSensorCollider()).toBeNull();
  });

  it("supports gap tiles (open-air drop without breaking chain) and swapTileType re-chaining (6m -> 12m bridge)", async () => {
    const RAPIER = await import("@dimforge/rapier3d-compat");
    await RAPIER.init();

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const scene = new THREE.Scene();

    const mockPiece = (id: string, length: number, hasGoal: boolean = false) => {
      const half = length / 2;
      const visGroup = new THREE.Group();
      visGroup.add(new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.2, length)));
      return {
        metadata: { id, dimensions: [6, 0.6, length], hasDynamicWalls: true },
        visualTemplate: visGroup,
        ubxFloorGeometry: new THREE.BoxGeometry(5.2, 0.1, length),
        ubxWallLGeometry: new THREE.BoxGeometry(0.4, 0.6, length),
        ubxWallRGeometry: new THREE.BoxGeometry(0.4, 0.6, length),
        sockets: hasGoal
          ? [{ id: "LOC_Socket_In", position: [0, 0, half], normal: [0, 0, 1], type: "track_arcade_6m", elevation: 0 }]
          : [
              { id: "LOC_Socket_In", position: [0, 0, half], normal: [0, 0, 1], type: "track_arcade_6m", elevation: 0 },
              { id: "LOC_Socket_Out", position: [0, 0, -half], normal: [0, 0, -1], type: "track_arcade_6m", elevation: 0 },
            ],
        locators: hasGoal ? new Map([["LOC_Sensor_Goal", new THREE.Vector3(0, 0, 0)]]) : new Map(),
      };
    };

    const mockLoader: any = {
      getPiece: (id: string) => {
        if (id === "carnival_bridge_pond_6x12") return mockPiece(id, 12);
        if (id === "carnival_green_cup_6x6") return mockPiece(id, 6, true);
        return mockPiece(id, 6);
      },
    };

    const { CourseManager } = await import("./CourseManager");
    const cm = new CourseManager(scene, world, RAPIER, mockLoader);

    cm.loadHole({
      holeNumber: 1,
      par: 3,
      teeTileId: "t_tee",
      cupTileId: "t_cup",
      tiles: [
        {
          instanceId: "t_tee",
          kitPieceId: "carnival_tee_6x6",
          position: [0, 0, 0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "t_mid" },
        },
        {
          instanceId: "t_mid",
          kitPieceId: "carnival_straight_6m",
          walls: { left: true, right: true },
          attachedTo: { parentInstanceId: "t_tee", parentSocketId: "LOC_Socket_Out", childSocketId: "LOC_Socket_In" },
          connectedSockets: { LOC_Socket_In: "t_tee", LOC_Socket_Out: "t_cup" },
        },
        {
          instanceId: "t_cup",
          kitPieceId: "carnival_green_cup_6x6",
          walls: { left: true, right: true },
          attachedTo: { parentInstanceId: "t_mid", parentSocketId: "LOC_Socket_Out", childSocketId: "LOC_Socket_In" },
          connectedSockets: { LOC_Socket_In: "t_mid" },
        },
      ],
      props: [],
    });

    expect(cm.getTile("t_cup")!.group.position.z).toBeCloseTo(-12.0, 2);

    // 1. Protect Tee and Cup from becoming gaps
    expect(cm.setTileGap("t_tee", true)).toBe(false);
    expect(cm.setTileGap("t_cup", true)).toBe(false);

    // 2. Make middle tile a gap -> mesh & colliders disappear, Cup stays at Z = -12
    expect(cm.setTileGap("t_mid", true)).toBe(true);
    const gapMid = cm.getTile("t_mid")!;
    expect(gapMid.tileData.isGap).toBe(true);
    expect(gapMid.group.children.length).toBe(0);
    expect(gapMid.wallLCollider).toBeUndefined();
    expect(cm.getTile("t_cup")!.group.position.z).toBeCloseTo(-12.0, 2);

    // Ball dropped at center of the gap falls right through Y = -0.3
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.5, -6.0));
    world.createCollider(RAPIER.ColliderDesc.ball(0.1), body);
    for (let i = 0; i < 45; i++) world.step();
    expect(body.translation().y).toBeLessThan(-0.3);

    // 3. Swap gap/straight tile into a 12m Pond Bridge -> restores solid surface and shifts Cup to Z = -18
    expect(cm.swapTileType("t_mid", "carnival_bridge_pond_6x12")).toBe(true);
    const swappedMid = cm.getTile("t_mid")!;
    expect(swappedMid.tileData.kitPieceId).toBe("carnival_bridge_pond_6x12");
    expect(swappedMid.tileData.isGap).toBe(false);
    expect(swappedMid.group.position.z).toBeCloseTo(-9.0, 2);
    expect(cm.getTile("t_cup")!.group.position.z).toBeCloseTo(-18.0, 2);
    expect(cm.getGoalPosition()!.z).toBeCloseTo(-18.0, 2);

    cm.clear();
  });

  it("exposes typed socket graph helpers connectTileSocket, disconnectTileSocket, and findIncomingSocketLinks", async () => {
    const RAPIER = await import("@dimforge/rapier3d-compat");
    await RAPIER.init();

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const scene = new THREE.Scene();

    const makeStraight = (id: string) => ({
      metadata: { id, dimensions: [6, 0.6, 6], hasDynamicWalls: false },
      visualTemplate: new THREE.Group(),
      sockets: [
        { id: "LOC_Socket_In", position: [0, 0, 3], normal: [0, 0, 1], type: "track_arcade_6m", elevation: 0 },
        { id: "LOC_Socket_Out", position: [0, 0, -3], normal: [0, 0, -1], type: "track_arcade_6m", elevation: 0 },
      ],
      locators: new Map(),
    });

    const mockLoader: any = {
      getPiece: (id: string) => makeStraight(id),
    };

    const { CourseManager } = await import("./CourseManager");
    const cm = new CourseManager(scene, world, RAPIER, mockLoader);

    cm.addTile({
      instanceId: "tile_a",
      kitPieceId: "tee_box_6x6",
      position: [0, 0, 0],
      rotationY: 0,
      walls: { left: true, right: true },
    });
    cm.addTile({
      instanceId: "tile_b",
      kitPieceId: "straight_6m",
      position: [0, 0, -6],
      rotationY: 0,
      walls: { left: true, right: true },
    });

    expect(cm.connectTileSocket("missing", "LOC_Socket_Out", "tile_b")).toBe(false);
    expect(cm.connectTileSocket("tile_a", "LOC_Socket_Out", "tile_b")).toBe(true);
    expect(cm.getTile("tile_a")?.tileData.connectedSockets?.["LOC_Socket_Out"]).toBe("tile_b");
    expect(cm.findIncomingSocketLinks("tile_b")).toEqual([
      { tileId: "tile_a", socketId: "LOC_Socket_Out" },
    ]);

    expect(cm.disconnectTileSocket("tile_a", "LOC_Socket_Out")).toBe(true);
    expect(cm.findIncomingSocketLinks("tile_b")).toEqual([]);
    expect(cm.disconnectTileSocket("tile_a", "LOC_Socket_Out")).toBe(false);

    cm.clear();
  });

  it("calculates spawnHeading aligned with tee direction and spline path", async () => {
    const RAPIER = await import("@dimforge/rapier3d-compat");
    await RAPIER.init();

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const scene = new THREE.Scene();

    const mockLoader: any = {
      getPiece: (id: string) => ({
        metadata: { id, dimensions: [6, 0.6, 6], hasDynamicWalls: true },
        visualTemplate: new THREE.Group(),
        sockets: [
          { id: "LOC_Socket_Out", position: [0, 0, -3], normal: [0, 0, -1], type: "track", elevation: 0 },
        ],
        locators: new Map([
          ["LOC_Spawn_Tee", new THREE.Vector3(0, 0.2, 0)],
        ]),
      }),
    };

    const { CourseManager } = await import("./CourseManager");
    const cm = new CourseManager(scene, world, RAPIER, mockLoader);

    // 1. Tee tile with rotationY = -90 (pointing towards +X)
    cm.loadHole({
      holeId: "test_h1",
      par: 3,
      teeTileId: "tee",
      cupTileId: "cup",
      tiles: [
        {
          instanceId: "tee",
          kitPieceId: "tee_6x6",
          position: [0, 0, 0],
          rotationY: -90,
          walls: { left: true, right: true },
        },
      ],
    });

    expect(cm.spawnHeading.x).toBeCloseTo(1.0, 2);
    expect(cm.spawnHeading.z).toBeCloseTo(0.0, 2);

    // 2. Hole with spline path overrides/sets spawnHeading directly from nodes[0] -> nodes[1]
    cm.loadHole({
      holeId: "test_h2",
      par: 3,
      teeTileId: "tee",
      cupTileId: "cup",
      tiles: [],
      splinePath: {
        closed: false,
        nodes: [
          { position: [0, 0, 0], handleOffset: [0, 0] },
          { position: [0, 0, 5], handleOffset: [0, 0] },
        ],
      },
    });

    expect(cm.spawnHeading.x).toBeCloseTo(0.0, 2);
    expect(cm.spawnHeading.z).toBeCloseTo(1.0, 2);

    cm.clear();
  });
  it("adds hovering chevron visuals to booster hazard tiles and animates/disposes them", async () => {
    const RAPIER = await import("@dimforge/rapier3d-compat");
    await RAPIER.init();

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const scene = new THREE.Scene();

    const mockLoader: any = {
      getPiece: (id: string) => ({
        metadata: { id, dimensions: [6, 0.6, 3], hasDynamicWalls: false, tags: ["hazard", "booster"] },
        visualTemplate: new THREE.Group(),
        sockets: [],
        locators: new Map(),
      }),
    };

    const { CourseManager } = await import("./CourseManager");
    const cm = new CourseManager(scene, world, RAPIER, mockLoader);

    const tile = cm.addTile({
      instanceId: "boost_tile",
      kitPieceId: "hazard_booster_strip_6x3",
      position: [0, 0, 0],
      rotationY: 0,
      walls: { left: true, right: true },
    });
    expect(tile).not.toBeNull();

    const chevrons = tile!.group.getObjectByName("Visual_Booster_Chevrons");
    expect(chevrons).toBeTruthy();

    const sensor = cm.getBoosterSensor(tile!.boosterSensorCollider!.handle)!;
    expect(sensor.visuals).toBeDefined();

    const y0 = sensor.visuals!.chevrons[0].position.y;
    cm.updateBoosterVisuals(0.7, 0.016);
    expect(sensor.visuals!.chevrons[0].position.y).not.toBeCloseTo(y0, 4);

    cm.removeTile("boost_tile");
    expect(cm.getBoosterSensor(tile!.boosterSensorCollider!.handle)).toBeUndefined();
    cm.clear();
  });
});

