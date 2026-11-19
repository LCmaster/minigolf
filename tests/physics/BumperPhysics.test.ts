import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import { PhysicsTestHarness } from "../helpers/PhysicsTestHarness";

describe("BumperPhysics Tests (Pinball Elastic Rebound)", () => {
  let RAPIER: typeof import("@dimforge/rapier3d-compat");

  beforeAll(async () => {
    RAPIER = await PhysicsTestHarness.getRapier();
  });

  it("deflects incoming golf ball with high restitution off cylindrical mushroom bumper", () => {
    const world = PhysicsTestHarness.createWorld();

    // Flat floor
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(3.0, 0.1, 3.0)
        .setTranslation(0, -0.1, 0)
        .setFriction(0.3)
    );

    // Cylindrical pinball bumper at origin with high restitution (1.2 arcade bounce)
    const bumperCollider = world.createCollider(
      RAPIER.ColliderDesc.cylinder(0.3, 0.35)
        .setTranslation(0, 0.3, 0)
        .setRestitution(1.1)
        .setFriction(0.1)
    );

    // Strike ball slightly off-center (X = 0.15) heading towards bumper (-Z)
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0.15, 0.1, 2.0)
      .setLinvel(0, 0, -6.0)
      .setCcdEnabled(true);
    const body = world.createRigidBody(bodyDesc);
    world.createCollider(
      RAPIER.ColliderDesc.ball(0.1).setRestitution(0.9).setFriction(0.2),
      body
    );

    let deflected = false;
    let postBounceVel = new THREE.Vector3();

    PhysicsTestHarness.stepSimulation(world, 60, 1 / 60, () => {
      const v = body.linvel();
      // Once Z velocity reverses (+Z) or significant lateral X deflection occurs
      if (!deflected && v.z > 1.0 && v.x > 1.0) {
        deflected = true;
        postBounceVel.set(v.x, v.y, v.z);
      }
    });

    expect(deflected).toBe(true);
    expect(postBounceVel.x).toBeGreaterThan(1.0); // Deflected to +X
    expect(postBounceVel.z).toBeGreaterThan(1.0); // Rebounded towards +Z
    expect(bumperCollider).toBeDefined();

    world.free();
  });
});

