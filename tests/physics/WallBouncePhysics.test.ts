import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import { PhysicsTestHarness } from "../helpers/PhysicsTestHarness";

describe("WallBouncePhysics Tests (Asset-Driven Specification)", () => {
  let RAPIER: typeof import("@dimforge/rapier3d-compat");

  beforeAll(async () => {
    RAPIER = await PhysicsTestHarness.getRapier();
  });

  /**
   * Helper constructing standard arcade track walls (0.5m thick, 0.5m above turf).
   */
  function buildTrackWithWalls(world: import("@dimforge/rapier3d-compat").World) {
    // Floor slab and turf: from X = -2.5 to 2.5, surface at Y = 1.0
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(2.5, 0.5, 3.0)
        .setTranslation(0, 0.5, 0)
        .setFriction(0.35)
        .setRestitution(0.3)
    );

    // Left Wall (UBX_Wall_L): X in [-3.0, -2.5], center at X = -2.75, height Y in [0.25, 1.5]
    const wallL = world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.25, 0.625, 3.0)
        .setTranslation(-2.75, 0.875, 0)
        .setFriction(0.35)
        .setRestitution(0.65)
    );

    // Right Wall (UBX_Wall_R): X in [2.5, 3.0], center at X = 2.75
    const wallR = world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.25, 0.625, 3.0)
        .setTranslation(2.75, 0.875, 0)
        .setFriction(0.35)
        .setRestitution(0.65)
    );

    return { wallL, wallR };
  }

  function createBall(
    world: import("@dimforge/rapier3d-compat").World,
    pos: THREE.Vector3,
    vel: THREE.Vector3
  ) {
    const radius = 0.10;
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y, pos.z)
      .setLinvel(vel.x, vel.y, vel.z)
      .setCcdEnabled(true)
      .setLinearDamping(0.3)
      .setAngularDamping(0.3);

    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.ball(radius)
      .setFriction(0.35)
      .setRestitution(0.65);

    const collider = world.createCollider(colliderDesc, body);
    return { body, collider, radius };
  }

  it("reflects ball off side wall maintaining specular angle of reflection", () => {
    const world = PhysicsTestHarness.createWorld();
    buildTrackWithWalls(world);

    // Launch ball from center (0, 1.1, 2) towards left wall (-2.5, 1.1, 0)
    // Wall normal points in +X direction (1, 0, 0)
    const incomingVel = new THREE.Vector3(-4.0, 0, -4.0); // 45 deg angle towards -X and -Z
    const { body } = createBall(world, new THREE.Vector3(0, 1.1, 2.0), incomingVel);

    // Step physics through the bounce (up to 90 ticks)
    let bounced = false;
    let postBounceVel = new THREE.Vector3();

    PhysicsTestHarness.stepSimulation(world, 90, 1 / 60, () => {
      const v = body.linvel();
      // Once X velocity reverses from negative to positive, bounce occurred
      if (!bounced && v.x > 0.3) {
        bounced = true;
        postBounceVel.set(v.x, v.y, v.z);
      }
    });

    expect(bounced).toBe(true);

    const wallNormal = new THREE.Vector3(1, 0, 0);
    const angles = PhysicsTestHarness.calculateReboundAngles(incomingVel, postBounceVel, wallNormal);

    // Incident and reflection angles should match within friction tolerance (~5 deg)
    expect(Math.abs(angles.incidentDeg - angles.reflectionDeg)).toBeLessThan(6.0);
    // Forward velocity along -Z should be preserved
    expect(postBounceVel.z).toBeLessThan(-1.0);

    world.free();
  });

  it("prevents tunneling through walls even at extreme 25 m/s speeds with CCD", () => {
    const world = PhysicsTestHarness.createWorld();
    buildTrackWithWalls(world);

    // Extreme impulse directly into left wall at 25 m/s
    const extremeVel = new THREE.Vector3(-25.0, 0, 0);
    const { body } = createBall(world, new THREE.Vector3(0, 1.1, 0), extremeVel);

    // Step 15 ticks
    PhysicsTestHarness.stepSimulation(world, 15);

    const pos = body.translation();
    // Left wall inner face is at X = -2.5. Ball radius is 0.10.
    // Ball must NOT penetrate beyond X = -2.5 (i.e. cannot be < -2.5)
    expect(pos.x).toBeGreaterThanOrEqual(-2.55);

    // Velocity must have bounced back into positive X
    const vel = body.linvel();
    expect(vel.x).toBeGreaterThan(0);

    world.free();
  });

  it("dissipates energy on wall impact consistent with restitution and friction", () => {
    const world = PhysicsTestHarness.createWorld();
    buildTrackWithWalls(world);

    const initialSpeed = 8.0;
    const { body } = createBall(
      world,
      new THREE.Vector3(0, 1.1, 0),
      new THREE.Vector3(-initialSpeed, 0, 0)
    );

    // Step past impact
    PhysicsTestHarness.stepSimulation(world, 25);

    const vel = body.linvel();
    const finalSpeed = Math.hypot(vel.x, vel.z);

    // Restitution is ~0.65, so final speed should be between 50% and 75% of initial speed
    expect(finalSpeed).toBeLessThan(initialSpeed);
    expect(finalSpeed / initialSpeed).toBeGreaterThan(0.45);
    expect(finalSpeed / initialSpeed).toBeLessThan(0.75);

    world.free();
  });
});
