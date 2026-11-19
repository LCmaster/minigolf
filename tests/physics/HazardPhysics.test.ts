import { describe, it, expect, beforeAll } from "vitest";
import { PhysicsTestHarness } from "../helpers/PhysicsTestHarness";

describe("HazardPhysics Tests (Sand Bunker Friction & Water Sensor)", () => {
  let RAPIER: typeof import("@dimforge/rapier3d-compat");

  beforeAll(async () => {
    RAPIER = await PhysicsTestHarness.getRapier();
  });

  function simulateRollDistance(surfaceFriction: number, linearDamping: number): number {
    const world = PhysicsTestHarness.createWorld();

    world.createCollider(
      RAPIER.ColliderDesc.cuboid(3.0, 0.1, 10.0)
        .setTranslation(0, -0.1, 0)
        .setFriction(surfaceFriction)
    );

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 0.1, 4.0)
      .setLinvel(0, 0, -6.0)
      .setLinearDamping(linearDamping)
      .setCcdEnabled(true);
    const body = world.createRigidBody(bodyDesc);
    world.createCollider(
      RAPIER.ColliderDesc.ball(0.1).setFriction(surfaceFriction),
      body
    );

    PhysicsTestHarness.stepSimulation(world, 90, 1 / 60);
    const distanceRolled = 4.0 - body.translation().z;
    world.free();
    return distanceRolled;
  }

  it("arrests ball velocity in high-friction sand bunker compared to standard turf", () => {
    const turfDistance = simulateRollDistance(0.35, 0.4);
    const sandDistance = simulateRollDistance(1.2, 3.5);

    expect(sandDistance).toBeLessThan(turfDistance * 0.55);
  });

  it("triggers water hazard sensor event when ball enters recessed water basin", () => {
    const world = PhysicsTestHarness.createWorld();
    const eventQueue = new RAPIER.EventQueue(true);

    // Water sensor volume
    const waterSensor = world.createCollider(
      RAPIER.ColliderDesc.cuboid(2.0, 0.25, 2.0)
        .setTranslation(0, -0.2, 0)
        .setSensor(true)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
    );

    // Ball dropping into water basin
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.2, 0)
    );
    const ballCollider = world.createCollider(
      RAPIER.ColliderDesc.ball(0.1).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body
    );

    let waterHazardTriggered = false;
    for (let i = 0; i < 30; i++) {
      world.step(eventQueue);
      eventQueue.drainCollisionEvents((h1, h2, started) => {
        if (
          started &&
          ((h1 === waterSensor.handle && h2 === ballCollider.handle) ||
            (h2 === waterSensor.handle && h1 === ballCollider.handle))
        ) {
          waterHazardTriggered = true;
        }
      });
    }

    expect(waterHazardTriggered).toBe(true);
    eventQueue.free();
    world.free();
  });
});

