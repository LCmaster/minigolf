import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import { PhysicsTestHarness } from "../helpers/PhysicsTestHarness";

describe("PhysicsTestHarness Unit Tests", () => {
  let RAPIER: typeof import("@dimforge/rapier3d-compat");

  beforeAll(async () => {
    RAPIER = await PhysicsTestHarness.getRapier();
  });

  it("initializes Rapier and creates world with specified gravity", () => {
    const world = PhysicsTestHarness.createWorld({ x: 0, y: -9.81, z: 0 });
    expect(world.gravity.y).toBeCloseTo(-9.81, 2);
    world.free();
  });

  it("steps physics simulation deterministically at 60Hz", () => {
    const world = PhysicsTestHarness.createWorld();
    let stepsCount = 0;

    PhysicsTestHarness.stepSimulation(world, 10, 1 / 60, () => {
      stepsCount++;
    });

    expect(stepsCount).toBe(10);
    expect(world.timestep).toBeCloseTo(1 / 60, 4);
    world.free();
  });

  it("detects rigid body settling accurately", () => {
    const world = PhysicsTestHarness.createWorld();

    const groundDesc = RAPIER.ColliderDesc.cuboid(5, 0.1, 5);
    world.createCollider(groundDesc);

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 1.0, 0)
      .setLinearDamping(0.8);
    const body = world.createRigidBody(bodyDesc);
    const ballCollider = RAPIER.ColliderDesc.ball(0.1).setRestitution(0.2);
    world.createCollider(ballCollider, body);

    const result = PhysicsTestHarness.stepUntilSettled(world, body, 300);

    expect(result.settled).toBe(true);
    expect(result.finalPos.y).toBeCloseTo(0.2, 1);
    expect(result.finalVel.length()).toBeLessThan(0.1);

    world.free();
  });

  it("calculates incident and reflection angles accurately", () => {
    const wallNormal = new THREE.Vector3(1, 0, 0);
    const incomingVel = new THREE.Vector3(-5, 0, 5);
    const outgoingVel = new THREE.Vector3(5, 0, 5);

    const angles = PhysicsTestHarness.calculateReboundAngles(incomingVel, outgoingVel, wallNormal);

    expect(angles.incidentDeg).toBeCloseTo(45, 1);
    expect(angles.reflectionDeg).toBeCloseTo(45, 1);
  });
});

