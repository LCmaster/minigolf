/**
 * BallController.ts
 * Manages physical and visual golf ball state, Rapier dynamics, and gameplay transitions.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { BallPlayState } from "../types/EngineEvents";

export class BallController {
  public mesh: THREE.Mesh;
  public ghostSphereMesh: THREE.Mesh;
  public rigidBody!: RAPIER.RigidBody;
  public collider!: RAPIER.Collider;

  private scene: THREE.Scene;
  private rapierWorld: RAPIER.World;
  private rapier: typeof RAPIER;

  public state: BallPlayState = "aiming";
  public strokes: number = 0;
  public radius: number = 0.1; // 10cm radius

  private stationaryFrames: number = 0;
  private pulseTime: number = 0;
  private lastSafePosition: THREE.Vector3 = new THREE.Vector3();
  private prevPosition: THREE.Vector3 = new THREE.Vector3();
  private prevQuaternion: THREE.Quaternion = new THREE.Quaternion();

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

    // Translucent pulsing ghost sphere shown around stationary ball when ready to shoot
    const ghostGeo = new THREE.SphereGeometry(this.radius * 2.5, 24, 16);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0xe0f7ff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.ghostSphereMesh = new THREE.Mesh(ghostGeo, ghostMat);
    this.ghostSphereMesh.name = "Ball_Ready_Ghost";
    this.scene.add(this.ghostSphereMesh);

    this.createPhysicsBody(new THREE.Vector3(0, 0.2, 0));
  }

  public createPhysicsBody(
    spawnPos: THREE.Vector3,
    options: { resetStrokes?: boolean } = {}
  ): void {
    const { resetStrokes = true } = options;
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
    this.prevPosition.copy(spawnPos);
    this.prevQuaternion.identity();
    this.ghostSphereMesh.position.copy(spawnPos);
    this.ghostSphereMesh.scale.set(1, 1, 1);
    this.ghostSphereMesh.visible = this.mesh.visible;
    this.lastSafePosition.copy(spawnPos);
    if (resetStrokes) {
      this.strokes = 0;
    }
    this.state = "aiming";
  }

  public capturePreviousTransform(): void {
    if (!this.rigidBody) return;
    const t = this.rigidBody.translation();
    const r = this.rigidBody.rotation();
    this.prevPosition.set(t.x, t.y, t.z);
    this.prevQuaternion.set(r.x, r.y, r.z, r.w);
  }

  public shoot(impulse: THREE.Vector3): void {
    if (this.state !== "aiming") return;

    this.capturePreviousTransform();
    this.strokes++;
    this.state = "moving";
    this.stationaryFrames = 0;
    this.ghostSphereMesh.visible = false;
    this.lastSafePosition.copy(this.mesh.position);

    // Apply impulse to Rapier body
    this.rigidBody.applyImpulse(
      new this.rapier.Vector3(impulse.x, impulse.y, impulse.z),
      true
    );
  }

  public update(interpolationAlpha: number = 1.0): void {
    if (!this.rigidBody) return;
    if (this.state === "in_hole") return;

    const t = this.rigidBody.translation();
    const r = this.rigidBody.rotation();
    if (this.state === "moving" && interpolationAlpha < 1.0) {
      const a = Math.max(0, Math.min(1, interpolationAlpha));
      this.mesh.position.set(
        THREE.MathUtils.lerp(this.prevPosition.x, t.x, a),
        THREE.MathUtils.lerp(this.prevPosition.y, t.y, a),
        THREE.MathUtils.lerp(this.prevPosition.z, t.z, a)
      );
      const currQuat = new THREE.Quaternion(r.x, r.y, r.z, r.w);
      this.mesh.quaternion.slerpQuaternions(this.prevQuaternion, currQuat, a);
    } else {
      this.mesh.position.set(t.x, t.y, t.z);
      this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }

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

  public sinkAt(targetPos: THREE.Vector3): void {
    this.state = "in_hole";
    this.stationaryFrames = 0;
    this.mesh.position.copy(targetPos);
    this.ghostSphereMesh.visible = false;
    if (this.rigidBody) {
      this.rigidBody.setBodyType(this.rapier.RigidBodyType.Fixed, true);
      this.rigidBody.setLinvel(new this.rapier.Vector3(0, 0, 0), true);
      this.rigidBody.setAngvel(new this.rapier.Vector3(0, 0, 0), true);
      this.rigidBody.setTranslation(
        new this.rapier.Vector3(targetPos.x, targetPos.y, targetPos.z),
        true
      );
      this.rigidBody.sleep();
    }
  }

  public respawn(): void {
    this.createPhysicsBody(this.lastSafePosition, { resetStrokes: false });
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position;
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
    if (!visible) {
      this.ghostSphereMesh.visible = false;
    } else {
      this.ghostSphereMesh.visible = this.state === "aiming";
    }
  }

  public updateReadyIndicator(deltaTime: number, isAimDragging: boolean = false): void {
    const shouldShow = this.mesh.visible && this.state === "aiming" && !isAimDragging;
    this.ghostSphereMesh.visible = shouldShow;
    this.ghostSphereMesh.position.copy(this.mesh.position);
    if (shouldShow) {
      this.pulseTime += deltaTime;
      const scale = 1.0 + Math.sin(this.pulseTime * 5.0) * 0.1;
      this.ghostSphereMesh.scale.set(scale, scale, scale);
    } else {
      this.ghostSphereMesh.scale.set(1, 1, 1);
    }
  }

  public disablePhysics(): void {
    if (this.rigidBody) {
      this.rapierWorld.removeRigidBody(this.rigidBody);
      this.rigidBody = undefined as unknown as RAPIER.RigidBody;
      this.collider = undefined as unknown as RAPIER.Collider;
    }
  }

  public dispose(): void {
    this.scene.remove(this.mesh);
    this.scene.remove(this.ghostSphereMesh);
    this.disablePhysics();
  }
}

