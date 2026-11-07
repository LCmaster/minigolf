/**
 * CameraController.ts
 * Dual-pitch (12.5° horizon aim <-> 60° tactical approach) third-person camera.
 * Features coupled pitch & distance arm, free 360° orbit, and smooth exponential follow damping.
 */

import * as THREE from "three";

export type CameraMode = "aiming" | "following" | "cup_zoom" | "overview";

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  private canvas?: HTMLCanvasElement;

  public mode: CameraMode = "aiming";
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Pitch constraints: 12.5° (low horizon) to 60.0° (high tactical)
  private readonly MIN_PITCH_DEG = 12.5;
  private readonly MAX_PITCH_DEG = 60.0;
  private readonly MIN_DISTANCE = 4.5;
  private readonly MAX_DISTANCE = 8.0;

  // Pitch progress in [0.0, 1.0]
  private pitchProgress: number = 0.35; // Default ~29° pleasant natural view
  private zoomScale: number = 1.0;

  // Orbit angles
  private yawAngle: number = 0; // In radians
  private isOrbiting: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;

  private currentCameraPos: THREE.Vector3 = new THREE.Vector3(0, 6, 8);
  private currentLookTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(camera: THREE.PerspectiveCamera, canvas?: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;

    this.currentCameraPos.copy(camera.position);
    this.currentLookTarget.copy(this.target);

    if (this.canvas) {
      this.setupOrbitListeners();
    }
  }

  public get pitchAngleDeg(): number {
    return this.MIN_PITCH_DEG + this.pitchProgress * (this.MAX_PITCH_DEG - this.MIN_PITCH_DEG);
  }

  public get pitchAngleRad(): number {
    return (this.pitchAngleDeg * Math.PI) / 180;
  }

  public get orbitDistance(): number {
    const baseDist = this.MIN_DISTANCE + this.pitchProgress * (this.MAX_DISTANCE - this.MIN_DISTANCE);
    return baseDist * this.zoomScale;
  }

  public setPitchProgress(p: number): void {
    this.pitchProgress = Math.max(0.0, Math.min(1.0, p));
  }

  public setTarget(targetPos: THREE.Vector3): void {
    this.target.copy(targetPos);
  }

  public snapToTarget(): void {
    this.currentLookTarget.copy(this.target);
    const desiredPos = this.calculateDesiredPosition(this.target);
    this.currentCameraPos.copy(desiredPos);
    this.camera.position.copy(desiredPos);
    this.camera.lookAt(this.target);
  }

  private calculateDesiredPosition(lookCenter: THREE.Vector3): THREE.Vector3 {
    const dist = this.orbitDistance;
    const pitch = this.pitchAngleRad;

    // Spherical coordinates
    const height = Math.sin(pitch) * dist;
    const groundRadius = Math.cos(pitch) * dist;

    // Yaw rotation (Z is forward/back, X is left/right)
    const offsetX = Math.sin(this.yawAngle) * groundRadius;
    const offsetZ = Math.cos(this.yawAngle) * groundRadius;

    return new THREE.Vector3(
      lookCenter.x + offsetX,
      lookCenter.y + height,
      lookCenter.z + offsetZ
    );
  }

  public update(deltaTime: number, ballSpeed: number = 0): void {
    const desiredLook = this.target.clone();

    if (this.mode === "cup_zoom") {
      // Tight celebratory cinematic zoom
      desiredLook.add(new THREE.Vector3(0, -0.05, 0));
    }

    const desiredPos = this.calculateDesiredPosition(desiredLook);

    // Exponential follow damping (smoothing factor = 6.0)
    const decay = 1.0 - Math.exp(-6.0 * Math.min(deltaTime, 0.1));
    this.currentLookTarget.lerp(desiredLook, decay);
    this.currentCameraPos.lerp(desiredPos, decay);

    this.camera.position.copy(this.currentCameraPos);
    this.camera.lookAt(this.currentLookTarget);
  }

  public handleOrbitDrag(deltaX: number, deltaY: number): void {
    // Horizontal drag = yaw 360°
    this.yawAngle -= deltaX * 0.006;

    // Vertical drag = pitch adjustment
    const pitchDelta = deltaY * 0.003;
    this.setPitchProgress(this.pitchProgress + pitchDelta);
  }

  public handleZoomScroll(deltaY: number): void {
    // Scroll adjusts pitch progress continuously
    const step = deltaY * 0.001;
    this.setPitchProgress(this.pitchProgress + step);
  }

  private setupOrbitListeners(): void {
    if (!this.canvas) return;

    this.canvas.addEventListener("pointerdown", (ev) => {
      // Right click drag or middle click for free orbit
      if (ev.button === 2 || ev.button === 1) {
        this.isOrbiting = true;
        this.lastPointerX = ev.clientX;
        this.lastPointerY = ev.clientY;
      }
    });

    window.addEventListener("pointermove", (ev) => {
      if (this.isOrbiting) {
        const dx = ev.clientX - this.lastPointerX;
        const dy = ev.clientY - this.lastPointerY;
        this.lastPointerX = ev.clientX;
        this.lastPointerY = ev.clientY;
        this.handleOrbitDrag(dx, dy);
      }
    });

    window.addEventListener("pointerup", (ev) => {
      if (ev.button === 2 || ev.button === 1) {
        this.isOrbiting = false;
      }
    });

    this.canvas.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      this.handleZoomScroll(ev.deltaY);
    }, { passive: false });

    this.canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());
  }
}
