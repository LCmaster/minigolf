/**
 * PhysicsTestHarness.ts
 * Reusable deterministic headless Rapier physics test harness.
 * Provides fixed 60Hz stepping, settling detection, and trajectory matchers.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

export class PhysicsTestHarness {
  private static rapierInstance: typeof RAPIER | null = null;

  public static async getRapier(): Promise<typeof RAPIER> {
    if (!this.rapierInstance) {
      await RAPIER.init();
      this.rapierInstance = RAPIER;
    }
    return this.rapierInstance;
  }

  public static createWorld(gravity = { x: 0, y: -9.81, z: 0 }): RAPIER.World {
    return new RAPIER.World(gravity);
  }

  /**
   * Advances the physics world by a discrete number of ticks at a fixed timestep.
   */
  public static stepSimulation(
    world: RAPIER.World,
    ticks = 60,
    dt = 1 / 60,
    onStep?: (tick: number) => void
  ): void {
    world.timestep = dt;
    for (let i = 0; i < ticks; i++) {
      world.step();
      onStep?.(i);
    }
  }

  /**
   * Steps simulation until a rigid body's linear speed drops below threshold,
   * or maxTicks is reached.
   */
  public static stepUntilSettled(
    world: RAPIER.World,
    body: RAPIER.RigidBody,
    maxTicks = 360, // 6 seconds at 60Hz
    speedThresholdSq = 0.005,
    consecutiveSettledTicks = 20
  ): { settled: boolean; ticks: number; finalPos: THREE.Vector3; finalVel: THREE.Vector3 } {
    let settledTicks = 0;
    let actualTicks = 0;

    for (let i = 0; i < maxTicks; i++) {
      world.step();
      actualTicks++;

      const vel = body.linvel();
      const speedSq = vel.x * vel.x + vel.y * vel.y + vel.z * vel.z;

      if (speedSq < speedThresholdSq) {
        settledTicks++;
        if (settledTicks >= consecutiveSettledTicks) {
          const t = body.translation();
          return {
            settled: true,
            ticks: actualTicks,
            finalPos: new THREE.Vector3(t.x, t.y, t.z),
            finalVel: new THREE.Vector3(vel.x, vel.y, vel.z),
          };
        }
      } else {
        settledTicks = 0;
      }
    }

    const t = body.translation();
    const v = body.linvel();
    return {
      settled: false,
      ticks: actualTicks,
      finalPos: new THREE.Vector3(t.x, t.y, t.z),
      finalVel: new THREE.Vector3(v.x, v.y, v.z),
    };
  }

  /**
   * Computes incident and reflection angles in degrees relative to a wall normal.
   */
  public static calculateReboundAngles(
    incomingVel: THREE.Vector3,
    outgoingVel: THREE.Vector3,
    wallNormal: THREE.Vector3
  ): { incidentDeg: number; reflectionDeg: number } {
    const norm = wallNormal.clone().normalize();
    const inDir = incomingVel.clone().negate().normalize();
    const outDir = outgoingVel.clone().normalize();

    // Incident angle between incoming vector and surface normal
    const incidentRad = inDir.angleTo(norm);
    // Reflection angle between outgoing vector and surface normal
    const reflectionRad = outDir.angleTo(norm);

    return {
      incidentDeg: (incidentRad * 180) / Math.PI,
      reflectionDeg: (reflectionRad * 180) / Math.PI,
    };
  }
}

