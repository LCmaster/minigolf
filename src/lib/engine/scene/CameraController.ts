/**
 * CameraController.ts
 * Manages overhead tracking camera, aim orbit controls, and cinematic cup zoom.
 */

import * as THREE from "three";

export type CameraMode = "aiming" | "following" | "cup_zoom";

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;

  public mode: CameraMode = "aiming";
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Offset when tracking the ball
  private followOffset: THREE.Vector3 = new THREE.Vector3(0, 11, 10);
  private currentCameraPos: THREE.Vector3 = new THREE.Vector3(0, 11, 10);
  private currentLookTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Orbit parameters for aiming mode
  private orbitAngle: number = 0;
  private isOrbiting: boolean = false;
  private lastPointerX: number = 0;

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;

    this.currentCameraPos.copy(camera.position);
    this.currentLookTarget.copy(this.target);

    this.setupOrbitListeners();
  }

  private setupOrbitListeners(): void {
    this.canvas.addEventListener("pointerdown", (ev) => {
      if (ev.button === 2) {
        // Right click to orbit camera
        this.isOrbiting = true;
        this.lastPointerX = ev.clientX;
      }
    });

    window.addEventListener("pointermove", (ev) => {
      if (this.isOrbiting) {
        const deltaX = ev.clientX - this.lastPointerX;
        this.lastPointerX = ev.clientX;
        this.orbitAngle -= deltaX * 0.006;
      }
    });

    window.addEventListener("pointerup", (ev) => {
      if (ev.button === 2) {
        this.isOrbiting = false;
      }
    });

    // Prevent context menu on right click
    this.canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
  }

  public setTarget(targetPos: THREE.Vector3): void {
    this.target.copy(targetPos);
  }

  public update(deltaTime: number, ballSpeed: number = 0): void {
    let desiredPos = new THREE.Vector3();
    let desiredLook = this.target.clone();

    if (this.mode === "cup_zoom") {
      // Close celebratory view of the cup
      desiredPos.set(this.target.x + 2.0, this.target.y + 2.5, this.target.z + 2.5);
    } else {
      // Orbit offset rotated around target
      const rotatedOffset = this.followOffset.clone();
      rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.orbitAngle);
      desiredPos.addVectors(this.target, rotatedOffset);
    }

    // Dynamic FOV based on speed
    const baseFov = 50;
    const targetFov = baseFov + Math.min(ballSpeed * 0.5, 8.0);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(deltaTime * 4.0, 1.0);
    this.camera.updateProjectionMatrix();

    // Critically damped position lerp
    const lerpFactor = Math.min(deltaTime * 6.0, 1.0);
    this.currentCameraPos.lerp(desiredPos, lerpFactor);
    this.currentLookTarget.lerp(desiredLook, lerpFactor);

    this.camera.position.copy(this.currentCameraPos);
    this.camera.lookAt(this.currentLookTarget);
  }
}
