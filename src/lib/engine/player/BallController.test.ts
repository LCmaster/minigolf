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

  it("interpolates visual mesh transform between physics steps when moving", () => {
    const ball = new BallController(scene, world, RAPIER);
    ball.state = "moving";

    ball.rigidBody.setTranslation(new RAPIER.Vector3(0, 0.2, 0), true);
    ball.capturePreviousTransform();

    ball.rigidBody.setTranslation(new RAPIER.Vector3(0, 0.2, -2.0), true);
    ball.update(0.5);

    expect(ball.mesh.position.z).toBeCloseTo(-1.0, 4);

    // At alpha = 1.0 (or aiming), snaps directly to latest physics translation
    ball.update(1.0);
    expect(ball.mesh.position.z).toBeCloseTo(-2.0, 4);

    ball.dispose();
  });

  it("resets stroke count to 0 when spawning physics body for a new hole, while preserving strokes on OOB respawn", () => {
    const ball = new BallController(scene, world, RAPIER);
    ball.shoot(new THREE.Vector3(0, 0, -1.0));
    expect(ball.strokes).toBe(1);

    // Out-of-bounds respawn must preserve the hole's stroke count
    ball.respawn();
    expect(ball.strokes).toBe(1);

    // Spawning fresh body for a new hole must reset strokes back to 0
    ball.createPhysicsBody(new THREE.Vector3(0, 0.2, -10));
    expect(ball.strokes).toBe(0);

    ball.shoot(new THREE.Vector3(0, 0, -1.0));
    expect(ball.strokes).toBe(1);

    ball.dispose();
  });

  it("attaches BallWindTrail to scene, activates on high-speed updates, and clears on sink/respawn/dispose", () => {
    const ball = new BallController(scene, world, RAPIER);
    expect(scene.children.includes(ball.windTrail.group)).toBe(true);
    expect(ball.windTrail.group.visible).toBe(false);

    ball.shoot(new THREE.Vector3(0, 0, -4.0));
    ball.rigidBody.setLinvel(new RAPIER.Vector3(0, 0, -9.5), true);

    for (let i = 0; i < 6; i++) {
      ball.rigidBody.setTranslation(new RAPIER.Vector3(0, 0.2, -0.15 * (i + 1)), true);
      ball.update(1.0, 0.016);
    }

    expect(ball.windTrail.group.visible).toBe(true);
    expect(ball.windTrail.intensity).toBeGreaterThan(0.1);

    ball.sinkAt(new THREE.Vector3(0, -0.2, -5));
    expect(ball.windTrail.group.visible).toBe(false);
    expect(ball.windTrail.intensity).toBe(0);

    // Respawn to recreate a dynamic body, re-activate, then test respawn clear + dispose cleanup
    ball.respawn();
    ball.state = "moving";
    ball.rigidBody.setLinvel(new RAPIER.Vector3(0, 0, -9.5), true);
    for (let i = 0; i < 4; i++) {
      ball.rigidBody.setTranslation(new RAPIER.Vector3(0, 0.2, -0.2 * (i + 1)), true);
      ball.update(1.0, 0.016);
    }
    expect(ball.windTrail.group.visible).toBe(true);

    ball.respawn();
    expect(ball.windTrail.group.visible).toBe(false);

    ball.dispose();
    expect(scene.children.includes(ball.windTrail.group)).toBe(false);
  });

  it("updates ball standard material color via setBallColor()", () => {
    const ball = new BallController(scene, world, RAPIER);
    ball.setBallColor("#38bdf8");

    const mat = ball.mesh.material as THREE.MeshStandardMaterial;
    expect(mat.color.getHexString()).toBe("38bdf8");

    ball.dispose();
  });
});

