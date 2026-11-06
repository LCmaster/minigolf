/**
 * BallController.ts
 * Manages physical and visual golf ball state, Rapier dynamics, and gameplay transitions.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { BallPlayState } from "../types/EngineEvents";

export class BallController {
  public mesh: THREE.Mesh;
  public rigidBody!: RAPIER.RigidBody;
  public collider!: RAPIER.Collider;

  private scene: THREE.Scene;
  private rapierWorld: RAPIER.World;
  private rapier: typeof RAPIER;

  public state: BallPlayState = "aiming";
  public strokes: number = 0;
  public radius: number = 0.1; // 10cm radius

  private stationaryFrames: number = 0;
  private lastSafePosition: THREE.Vector3 = new THREE.Vector3();

  constructor(scene: THREE.Scene, rapierWorld: RAPIER.World, rapier: typeof RAPIER) {
    this.scene = scene;
    this.rapierWorld = rapierWorld;
    this.rapier = rapier;

    // Visual Mesh
    const geometry = new THREE.SphereGeometry(this.radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.05,
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    this.createPhysicsBody(new THREE.Vector3(0, 0.2, 0));
  }

  public createPhysicsBody(spawnPos: THREE.Vector3): void {
    if (this.rigidBody) {
      this.rapierWorld.removeRigidBody(this.rigidBody);
    }

    const bodyDesc = this.rapier.RigidBodyDesc.dynamic()
      .setTranslation(spawnPos.x, spawnPos.y, spawnPos.z)
      .setCcdEnabled(true)
      .setLinearDamping(0.6)
      .setAngularDamping(0.5);

    this.rigidBody = this.rapierWorld.createRigidBody(bodyDesc);

    const colliderDesc = this.rapier.ColliderDesc.ball(this.radius)
      .setFriction(0.35)
      .setRestitution(0.65)
      .setDensity(1.2)
      .setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS);

    this.collider = this.rapierWorld.createCollider(colliderDesc, this.rigidBody);

    this.mesh.position.copy(spawnPos);
    this.lastSafePosition.copy(spawnPos);
    this.state = "aiming";
  }

  public shoot(impulse: THREE.Vector3): void {
    if (this.state !== "aiming") return;

    this.strokes++;
    this.state = "moving";
    this.stationaryFrames = 0;
    this.lastSafePosition.copy(this.mesh.position);

    // Apply impulse to Rapier body
    this.rigidBody.applyImpulse(
      new this.rapier.Vector3(impulse.x, impulse.y, impulse.z),
      true
    );
  }

  public update(): void {
    if (!this.rigidBody) return;

    const t = this.rigidBody.translation();
    const r = this.rigidBody.rotation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);

    // Out of bounds check (fell off course)
    if (t.y < -5.0 && this.state !== "out_of_bounds") {
      this.state = "out_of_bounds";
      return;
    }

    // Velocity settling check
    if (this.state === "moving") {
      const linvel = this.rigidBody.linvel();
      const speedSq = linvel.x * linvel.x + linvel.y * linvel.y + linvel.z * linvel.z;

      if (speedSq < 0.005) {
        this.stationaryFrames++;
        if (this.stationaryFrames > 25) {
          // Settled to complete stop
          this.rigidBody.setLinvel(new this.rapier.Vector3(0, 0, 0), true);
          this.rigidBody.setAngvel(new this.rapier.Vector3(0, 0, 0), true);
          this.state = "aiming";
          this.stationaryFrames = 0;
        }
      } else {
        this.stationaryFrames = 0;
      }
    }
  }

  public respawn(): void {
    this.createPhysicsBody(this.lastSafePosition);
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position;
  }

  public dispose(): void {
    this.scene.remove(this.mesh);
    if (this.rigidBody) {
      this.rapierWorld.removeRigidBody(this.rigidBody);
    }
  }
}

