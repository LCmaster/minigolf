import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { SocketSolver } from "../src/lib/engine/course/SocketSolver";
import type { SocketDefinition, PlacedTile } from "../src/lib/engine/types/KitTypes";

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

    // 3. Snap 45-deg Turn
    const rad45 = (45 * Math.PI) / 180;
    const R = 6.0;
    const dx = R * (1.0 - Math.cos(rad45));
    const dy = -3.0 + R * Math.sin(rad45);
    const nx = Math.sin(rad45);
    const ny = Math.cos(rad45);

    const turnSocketOut: SocketDefinition = {
      id: "LOC_Socket_Out",
      position: [dx, 0, -dy],
      normal: [nx, 0, -ny],
      type: "track_arcade_6m",
      elevation: 0,
    };

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

    const { CourseManager } = await import("../src/lib/engine/course/CourseManager");
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

    // 4. Goal sensor
    expect(cm.getGoalSensorCollider()).not.toBeNull();

    // 5. Cleanup
    cm.clear();
    expect(scene.children.length).toBe(0);
    expect(cm.getGoalSensorCollider()).toBeNull();
  });
});
