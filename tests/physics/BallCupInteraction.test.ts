import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import { PhysicsTestHarness } from "../helpers/PhysicsTestHarness";

describe("BallCupInteraction Physics Tests (Asset-Driven Specification)", () => {
  let RAPIER: typeof import("@dimforge/rapier3d-compat");

  beforeAll(async () => {
    RAPIER = await PhysicsTestHarness.getRapier();
  });

  /**
   * Helper to construct a physical putting green tile with a circular cup cavity
   * adhering to static/tiles_pack_01.blend (turf at Y=1.0, cup floor at Y=0.5, radius=0.425m).
   */
  function buildPuttingGreenWithCup(world: import("@dimforge/rapier3d-compat").World) {
    const cupCenter = new THREE.Vector3(0, 0, -0.25);
    const cupRadius = 0.425;
    const turfElevation = 1.0;
    const cupFloorElevation = 0.5;

    // 1. Turf surface colliders surrounding the cup (left, right, front, back)
    // Left turf slab (X from -2.5 to -0.425)
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(1.0375, 0.375, 2.75)
        .setTranslation(-1.4625, 0.625, -0.25)
        .setFriction(0.35)
        .setRestitution(0.4)
    );

    // Right turf slab (X from 0.425 to 2.5)
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(1.0375, 0.375, 2.75)
        .setTranslation(1.4625, 0.625, -0.25)
        .setFriction(0.35)
        .setRestitution(0.4)
    );

    // Front turf slab (Z from -3.0 to -0.675)
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.425, 0.375, 1.1625)
        .setTranslation(0, 0.625, -1.8375)
        .setFriction(0.35)
        .setRestitution(0.4)
    );

    // Back turf slab (Z from 0.175 to 2.5)
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.425, 0.375, 1.1625)
        .setTranslation(0, 0.625, 1.3375)
        .setFriction(0.35)
        .setRestitution(0.4)
    );

    // 2. Cup bottom floor collider at Y = 0.50
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(cupRadius, 0.05, cupRadius)
        .setTranslation(cupCenter.x, cupFloorElevation - 0.05, cupCenter.z)
        .setFriction(0.4)
        .setRestitution(0.2)
    );

    // 3. Goal Sensor trigger at the bottom of the cup (UBX_Hole_Indicator)
    const goalSensor = world.createCollider(
      RAPIER.ColliderDesc.cylinder(0.025, cupRadius)
        .setTranslation(cupCenter.x, cupFloorElevation + 0.025, cupCenter.z)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
    );

    return { cupCenter, cupRadius, turfElevation, cupFloorElevation, goalSensor };
  }

  function createGolfBall(
    world: import("@dimforge/rapier3d-compat").World,
    pos: THREE.Vector3,
    linvel = new THREE.Vector3(0, 0, 0)
  ) {
    const ballRadius = 0.10;
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y, pos.z)
      .setLinvel(linvel.x, linvel.y, linvel.z)
      .setCcdEnabled(true)
      .setLinearDamping(0.6)
      .setAngularDamping(0.5);

    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.ball(ballRadius)
      .setFriction(0.35)
      .setRestitution(0.65)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);

    const collider = world.createCollider(colliderDesc, body);
    return { body, collider, ballRadius };
  }

  it("captures a ball dropped above the hole and settles on the cup bottom floor", () => {
    const world = PhysicsTestHarness.createWorld();
    const { cupCenter, cupFloorElevation } = buildPuttingGreenWithCup(world);

    // Drop ball from Y = 1.3m directly above cup center
    const { body, ballRadius } = createGolfBall(
      world,
      new THREE.Vector3(cupCenter.x, 1.3, cupCenter.z)
    );

    const result = PhysicsTestHarness.stepUntilSettled(world, body, 300);

    expect(result.settled).toBe(true);
    // Ball rested on cup bottom: Y = cupFloorElevation + ballRadius
    expect(result.finalPos.y).toBeCloseTo(cupFloorElevation + ballRadius, 1);
    // Center alignment within hole radius
    expect(result.finalPos.distanceTo(new THREE.Vector3(cupCenter.x, result.finalPos.y, cupCenter.z))).toBeLessThan(0.35);

    world.free();
  });

  it("sinks a smoothly putted ball rolled towards the cup", () => {
    const world = PhysicsTestHarness.createWorld();
    const { cupCenter, cupFloorElevation } = buildPuttingGreenWithCup(world);

    // Ball starts 1.5m away on turf (Z = 1.25), rolling along -Z towards cup (Z = -0.25)
    // Rolling speed = 1.5 m/s
    const startPos = new THREE.Vector3(0, 1.1, 1.25);
    const { body, ballRadius } = createGolfBall(
      world,
      startPos,
      new THREE.Vector3(0, 0, -1.5)
    );

    const result = PhysicsTestHarness.stepUntilSettled(world, body, 400);

    expect(result.settled).toBe(true);
    // Ball settled inside cup below turf elevation (< 1.0)
    expect(result.finalPos.y).toBeLessThan(0.8);
    expect(result.finalPos.y).toBeCloseTo(cupFloorElevation + ballRadius, 1);

    world.free();
  });

  it("allows ball struck at extreme speed to overshoot the cup without unrealistically sinking", () => {
    const world = PhysicsTestHarness.createWorld();
    const { cupFloorElevation } = buildPuttingGreenWithCup(world);

    // Ball struck at very high velocity (14 m/s) across cup
    const startPos = new THREE.Vector3(0, 1.1, 1.25);
    const { body } = createGolfBall(
      world,
      startPos,
      new THREE.Vector3(0, 0, -14.0)
    );

    // Step 20 ticks (1/3 second)
    PhysicsTestHarness.stepSimulation(world, 20);

    const currentPos = body.translation();
    // Ball should have crossed over the cup (Z < -0.5) and remained on turf elevation (Y > 0.9)
    expect(currentPos.z).toBeLessThan(-0.5);
    expect(currentPos.y).toBeGreaterThan(0.9);

    world.free();
  });
});

