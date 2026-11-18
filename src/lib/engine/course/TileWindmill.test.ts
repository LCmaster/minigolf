import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {
  WindmillVisuals,
  WINDMILL_HUB_OFFSET,
  WINDMILL_BLADE_LENGTH,
  WINDMILL_ANGULAR_SPEED,
  hideLegacyWindmillBlades,
} from "./WindmillVisuals";
import { isWindmillTile, createTileWindmill } from "./TileWindmill";

beforeAll(async () => {
  await RAPIER.init();
});

describe("WindmillVisuals & TileWindmill (TDD)", () => {
  it("builds 4 volumetric blades sweeping low into the archway opening and rotates smoothly", () => {
    const visuals = new WindmillVisuals();

    expect(visuals.group.name).toBe("Visual_Windmill_Rotor");
    expect(visuals.group.position.x).toBeCloseTo(WINDMILL_HUB_OFFSET[0], 4);
    expect(visuals.group.position.y).toBeCloseTo(WINDMILL_HUB_OFFSET[1], 4);
    expect(visuals.group.position.z).toBeCloseTo(WINDMILL_HUB_OFFSET[2], 4);
    expect(visuals.blades).toHaveLength(4);

    // At angle 0, bottom tip sweeps down below 0.20m so it blocks/bounces a rolling ball (radius 0.10m)
    const tipHeightAtZero = WINDMILL_HUB_OFFSET[1] - WINDMILL_BLADE_LENGTH;
    expect(tipHeightAtZero).toBeGreaterThan(0.02);
    expect(tipHeightAtZero).toBeLessThan(0.2);

    const zBefore = visuals.rotorGroup.rotation.z;
    visuals.update(0.5);
    expect(visuals.rotorGroup.rotation.z).toBeCloseTo(zBefore + WINDMILL_ANGULAR_SPEED * 0.5, 4);

    let disposed = 0;
    for (const blade of visuals.blades) {
      blade.geometry.addEventListener("dispose", () => disposed++);
    }
    visuals.dispose();
    expect(disposed).toBeGreaterThan(0);
  });

  it("hides legacy static Mesh_Blade_* meshes cleanly", () => {
    const group = new THREE.Group();
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    b1.name = "Mesh_Blade_1";
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    b2.name = "Mesh_Blade_2.001";
    const tower = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    tower.name = "Mesh_Tower";
    group.add(b1, b2, tower);

    hideLegacyWindmillBlades(group);
    expect(b1.visible).toBe(false);
    expect(b2.visible).toBe(false);
    expect(tower.visible).toBe(true);
  });

  it("detects windmill kit pieces and manages kinematic Rapier blade colliders", () => {
    expect(isWindmillTile("carnival_windmill_6x12")).toBe(true);
    expect(isWindmillTile("obstacle_windmill_6x12")).toBe(true);
    expect(isWindmillTile("carnival_straight_6m")).toBe(false);

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const bumperHandles = new Set<number>();
    const tileGroup = new THREE.Group();
    tileGroup.position.set(6, 1.5, -12);
    tileGroup.rotation.y = Math.PI / 2;
    tileGroup.updateMatrixWorld(true);

    const windmill = createTileWindmill(RAPIER, world, tileGroup, bumperHandles);

    expect(windmill.colliders).toHaveLength(4);
    expect(world.bodies.len()).toBe(1);
    expect(world.colliders.len()).toBe(4);
    for (const col of windmill.colliders) {
      expect(bumperHandles.has(col.handle)).toBe(true);
      expect(col.restitution()).toBeGreaterThanOrEqual(0.95);
    }

    const qBefore = new THREE.Quaternion(
      windmill.rigidBody.rotation().x,
      windmill.rigidBody.rotation().y,
      windmill.rigidBody.rotation().z,
      windmill.rigidBody.rotation().w
    );
    windmill.update(0.5);
    world.step();
    const qAfter = new THREE.Quaternion(
      windmill.rigidBody.rotation().x,
      windmill.rigidBody.rotation().y,
      windmill.rigidBody.rotation().z,
      windmill.rigidBody.rotation().w
    );
    expect(qBefore.angleTo(qAfter)).toBeGreaterThan(0.2);

    windmill.dispose();
    expect(bumperHandles.size).toBe(0);
    expect(world.bodies.len()).toBe(0);
    expect(world.colliders.len()).toBe(0);
  });
});
