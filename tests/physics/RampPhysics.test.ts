import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import { PhysicsTestHarness } from "../helpers/PhysicsTestHarness";

describe("RampPhysics Tests (Elevation Momentum & Gravity)", () => {
  let RAPIER: typeof import("@dimforge/rapier3d-compat");

  beforeAll(async () => {
    RAPIER = await PhysicsTestHarness.getRapier();
  });

  function createRampCollider(
    world: import("@dimforge/rapier3d-compat").World,
    slopeAngleDeg: number
  ) {
    const rad = (slopeAngleDeg * Math.PI) / 180;
    const quat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rad);

    // 6m long ramp rotated by slopeAngleDeg around X
    const rampDesc = RAPIER.ColliderDesc.cuboid(2.5, 0.1, 3.0)
      .setRotation({ x: quat.x, y: quat.y, z: quat.z, w: quat.w })
      .setFriction(0.35)
      .setRestitution(0.3);

    return world.createCollider(rampDesc);
  }

  it("decelerates ball climbing a 15-degree upward ramp and rolls back if underpowered", () => {
    const world = PhysicsTestHarness.createWorld();
    // Positive rotation around X tilts -Z upwards!
    createRampCollider(world, 15);

    // Place ball near bottom of ramp (Z = 2.0) with modest upward velocity (-Z)
    const rad = (15 * Math.PI) / 180;
    const startZ = 2.0;
    const startY = -startZ * Math.tan(rad) + 0.25;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, startY, startZ)
      .setLinvel(0, Math.sin(rad) * 2.5, -Math.cos(rad) * 2.5)
      .setCcdEnabled(true);
    const body = world.createRigidBody(bodyDesc);
    world.createCollider(RAPIER.ColliderDesc.ball(0.1).setFriction(0.35), body);

    let minZReached = startZ;
    let rolledBack = false;

    PhysicsTestHarness.stepSimulation(world, 120, 1 / 60, () => {
      const pos = body.translation();
      const vel = body.linvel();
      if (pos.z < minZReached) {
        minZReached = pos.z;
      }
      // After climbing, gravity pulls it back towards +Z
      if (minZReached < 1.5 && vel.z > 0.3) {
        rolledBack = true;
      }
    });

    expect(minZReached).toBeLessThan(startZ);
    expect(rolledBack).toBe(true);
    world.free();
  });

  it("accelerates ball rolling down a 15-degree downward slope", () => {
    const world = PhysicsTestHarness.createWorld();
    createRampCollider(world, 15);

    const rad = (15 * Math.PI) / 180;
    const startZ = -2.0;
    const startY = -startZ * Math.tan(rad) + 0.25;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, startY, startZ)
      .setLinvel(0, 0, 0)
      .setCcdEnabled(true);
    const body = world.createRigidBody(bodyDesc);
    world.createCollider(RAPIER.ColliderDesc.ball(0.1).setFriction(0.2), body);

    PhysicsTestHarness.stepSimulation(world, 60, 1 / 60);

    const vel = body.linvel();
    const pos = body.translation();

    // Ball should have accelerated downhill (+Z) and gained significant speed
    expect(pos.z).toBeGreaterThan(startZ + 0.5);
    expect(vel.z).toBeGreaterThan(1.5);
    world.free();
  });
});

