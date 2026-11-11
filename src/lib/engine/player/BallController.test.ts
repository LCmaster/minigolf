import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import * as THREE from "three";
import { BallController } from "./BallController";

describe("BallController Unit Tests", () => {
  let RAPIER: typeof import("@dimforge/rapier3d-compat");
  let world: import("@dimforge/rapier3d-compat").World;
  let scene: THREE.Scene;

  beforeAll(async () => {
    RAPIER = await import("@dimforge/rapier3d-compat");
    await RAPIER.init();
  });

  beforeEach(() => {
    world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    scene = new THREE.Scene();
  });

  it("initializes with visual mesh, physics body, and aiming state", () => {
    const ball = new BallController(scene, world, RAPIER);

    expect(ball.state).toBe("aiming");
    expect(ball.strokes).toBe(0);
    expect(ball.radius).toBe(0.1);
    expect(scene.children.includes(ball.mesh)).toBe(true);

    const pos = ball.getPosition();
    expect(pos.x).toBeCloseTo(0, 2);
    expect(pos.y).toBeCloseTo(0.2, 2);
    expect(pos.z).toBeCloseTo(0, 2);

    expect(ball.rigidBody).toBeDefined();
    expect(ball.rigidBody.isCcdEnabled()).toBe(true);

    ball.dispose();
  });

  it("increments strokes and transitions to moving on shoot", () => {
    const ball = new BallController(scene, world, RAPIER);

    const impulse = new THREE.Vector3(0, 0, -2.5);
    ball.shoot(impulse);

    expect(ball.strokes).toBe(1);
    expect(ball.state).toBe("moving");

    // Second shoot while already moving should be rejected
    ball.shoot(impulse);
    expect(ball.strokes).toBe(1);

    ball.dispose();
  });

  it("synchronizes visual mesh position and rotation with Rapier body during update", () => {
    const ball = new BallController(scene, world, RAPIER);

    // Step physics world
    ball.rigidBody.setTranslation(new RAPIER.Vector3(1.5, 0.5, -3.2), true);
    ball.update();

    expect(ball.mesh.position.x).toBeCloseTo(1.5, 2);
    expect(ball.mesh.position.y).toBeCloseTo(0.5, 2);
    expect(ball.mesh.position.z).toBeCloseTo(-3.2, 2);

    ball.dispose();
  });

  it("detects out-of-bounds when ball falls below Y = -5.0", () => {
    const ball = new BallController(scene, world, RAPIER);

    ball.rigidBody.setTranslation(new RAPIER.Vector3(0, -5.5, 0), true);
    ball.update();

    expect(ball.state).toBe("out_of_bounds");

    ball.dispose();
  });

  it("settles to complete stop and transitions back to aiming after 26 stationary frames", () => {
    const ball = new BallController(scene, world, RAPIER);
    ball.shoot(new THREE.Vector3(0, 0, -1.0));
    expect(ball.state).toBe("moving");

    // Set nearly zero velocity
    ball.rigidBody.setLinvel(new RAPIER.Vector3(0.0001, 0, 0.0001), true);

    for (let frame = 0; frame < 26; frame++) {
      ball.update();
    }

    expect(ball.state).toBe("aiming");
    const vel = ball.rigidBody.linvel();
    expect(vel.x).toBe(0);
    expect(vel.y).toBe(0);
    expect(vel.z).toBe(0);

    ball.dispose();
  });

  it("respawns ball to last safe position", () => {
    const ball = new BallController(scene, world, RAPIER);
    const startPos = ball.getPosition().clone();

    // Shoot and fall out of bounds
    ball.shoot(new THREE.Vector3(0, 0, -5));
    ball.rigidBody.setTranslation(new RAPIER.Vector3(0, -6.0, -10), true);
    ball.update();
    expect(ball.state).toBe("out_of_bounds");

    // Respawn
    ball.respawn();
    expect(ball.state).toBe("aiming");
    expect(ball.getPosition().x).toBeCloseTo(startPos.x, 2);
    expect(ball.getPosition().y).toBeCloseTo(startPos.y, 2);
    expect(ball.getPosition().z).toBeCloseTo(startPos.z, 2);

    ball.dispose();
  });

  it("cleanly removes mesh, ghost sphere, and physics body on dispose", () => {
    const ball = new BallController(scene, world, RAPIER);
    expect(scene.children.includes(ball.mesh)).toBe(true);
    expect(scene.children.includes(ball.ghostSphereMesh)).toBe(true);
    expect(world.bodies.len()).toBe(1);

    ball.dispose();

    expect(scene.children.includes(ball.mesh)).toBe(false);
    expect(scene.children.includes(ball.ghostSphereMesh)).toBe(false);
    expect(world.bodies.len()).toBe(0);
  });

  it("pulses translucent ghost sphere when stopped and aiming, and hides while moving, dragging, or sunk", () => {
    const ball = new BallController(scene, world, RAPIER);

    ball.updateReadyIndicator(0.15, false);
    expect(ball.ghostSphereMesh.visible).toBe(true);
    expect(ball.ghostSphereMesh.scale.x).not.toBe(1.0);

    // Hide during active slingshot drag
    ball.updateReadyIndicator(0.016, true);
    expect(ball.ghostSphereMesh.visible).toBe(false);

    // Hide while ball is moving
    ball.shoot(new THREE.Vector3(0, 0, -1.0));
    ball.updateReadyIndicator(0.016, false);
    expect(ball.ghostSphereMesh.visible).toBe(false);

    // Re-show once ball returns to aiming
    ball.state = "aiming";
    ball.updateReadyIndicator(0.1, false);
    expect(ball.ghostSphereMesh.visible).toBe(true);

    // Hide when sunk
    ball.sinkAt(new THREE.Vector3(0, -0.2, -6));
    ball.updateReadyIndicator(0.016, false);
    expect(ball.ghostSphereMesh.visible).toBe(false);

    ball.dispose();
  });
});

