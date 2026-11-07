import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import { PhysicsTestHarness } from "../helpers/PhysicsTestHarness";
import { SeamWelder, type TileFloorMeshInfo } from "../../src/lib/engine/physics/SeamWelder";

describe("SeamTraversal Physics Tests (Zero-Snag Welded Boundaries)", () => {
  let RAPIER: typeof import("@dimforge/rapier3d-compat");

  beforeAll(async () => {
    RAPIER = await PhysicsTestHarness.getRapier();
  });

  it("rolls smoothly across welded tile seam with zero vertical snagging or bounce", () => {
    const world = PhysicsTestHarness.createWorld();

    // Tile 1: Straight fairway from Z = 3.0 to Z = 0.0, surface at Y = 1.0
    const geo1 = new THREE.BufferGeometry();
    const pos1 = new Float32Array([
      -2.5, 1.0, 3.0,
       2.5, 1.0, 3.0,
       2.5, 1.0, 0.0,
      -2.5, 1.0, 0.0,
    ]);
    const idx1 = new Uint16Array([0, 1, 2, 0, 2, 3]);
    geo1.setAttribute("position", new THREE.BufferAttribute(pos1, 3));
    geo1.setIndex(new THREE.BufferAttribute(idx1, 1));

    // Tile 2: Next fairway from Z = 0.0 to Z = -3.0, surface at Y = 1.0
    // Coincident edge at Z = 0.0
    const geo2 = new THREE.BufferGeometry();
    const pos2 = new Float32Array([
      -2.5, 1.0,  0.0,
       2.5, 1.0,  0.0,
       2.5, 1.0, -3.0,
      -2.5, 1.0, -3.0,
    ]);
    const idx2 = new Uint16Array([0, 1, 2, 0, 2, 3]);
    geo2.setAttribute("position", new THREE.BufferAttribute(pos2, 3));
    geo2.setIndex(new THREE.BufferAttribute(idx2, 1));

    const tiles: TileFloorMeshInfo[] = [
      { geometry: geo1, worldMatrix: new THREE.Matrix4().identity() },
      { geometry: geo2, worldMatrix: new THREE.Matrix4().identity() },
    ];

    // Weld floors into unified Trimesh collider
    const weldedColliderDesc = SeamWelder.weldFloorsToRapierTrimesh(tiles, RAPIER);
    expect(weldedColliderDesc).not.toBeNull();
    world.createCollider(weldedColliderDesc!);

    // Roll ball from Z = 2.0 along -Z towards Z = -2.0 at 3.0 m/s
    const ballRadius = 0.10;
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 1.0 + ballRadius, 2.0)
      .setLinvel(0, 0, -3.0)
      .setCcdEnabled(true)
      .setLinearDamping(0.1);

    const body = world.createRigidBody(bodyDesc);
    world.createCollider(RAPIER.ColliderDesc.ball(ballRadius).setFriction(0.35), body);

    // Track vertical position throughout traversal
    let maxVerticalDeviation = 0;
    const initialY = 1.0 + ballRadius;

    // Step 80 ticks (~1.3 seconds, ball travels ~4 meters to Z = -2.0)
    PhysicsTestHarness.stepSimulation(world, 80, 1 / 60, () => {
      const pos = body.translation();
      const dev = Math.abs(pos.y - initialY);
      if (dev > maxVerticalDeviation) {
        maxVerticalDeviation = dev;
      }
    });

    const finalPos = body.translation();
    // Ball crossed the seam at Z = 0 into negative Z
    expect(finalPos.z).toBeLessThan(-0.5);

    // Vertical deviation must remain minimal (< 3mm) with no ghost bounce!
    expect(maxVerticalDeviation).toBeLessThan(0.004);

    world.free();
  });
});
