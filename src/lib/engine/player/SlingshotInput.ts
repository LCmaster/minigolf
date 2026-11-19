/**
 * SlingshotInput.ts
 * Drag-and-aim slingshot input handler for mouse and touch.
 */

import * as THREE from "three";
import type { BallController } from "./BallController";
import type { CameraController } from "../scene/CameraController";
import { AimArrowMesh } from "./AimArrowMesh";

export const POWER_CURVE_STEEPNESS = 2.6;
export const MAX_IMPULSE_FORCE = 0.18;
export const HIGH_POWER_JITTER_THRESHOLD = 0.85;
export const HIGH_POWER_JITTER_MAX_RAD = 0.065;

/**
 * Progressive exponential force scaling: fine low-drag control for close putts,
 * surging sharply above 75% power to clear ramp jump-overs.
 */
export function computeCurvedPower(rawPower: number): number {
  const p = Math.max(0, Math.min(1, rawPower));
  const k = POWER_CURVE_STEEPNESS;
  return (Math.exp(k * p) - 1) / (Math.exp(k) - 1);
}

/**
 * Deterministic high-power aim tremble shared between AimArrowMesh visuals
 * and ball launch angle upon release (> 85% raw pullback).
 */
export function computeAimJitterAngle(rawPower: number, timeSec: number): number {
  if (rawPower <= HIGH_POWER_JITTER_THRESHOLD) return 0;
  const factor = (rawPower - HIGH_POWER_JITTER_THRESHOLD) / (1.0 - HIGH_POWER_JITTER_THRESHOLD);
  return Math.sin(timeSec * 36) * HIGH_POWER_JITTER_MAX_RAD * factor;
}

export interface PointerEventTarget {
  addEventListener(type: string, listener: (ev: any) => void): void;
  removeEventListener(type: string, listener: (ev: any) => void): void;
}

export interface SlingshotInputOptions {
  eventTarget?: PointerEventTarget;
}

export class SlingshotInput {
  private canvas: HTMLCanvasElement;
  private camera: THREE.Camera;
  private ball: BallController;
  private cameraController?: CameraController;
  private eventTarget: PointerEventTarget | null;
  public arrow: AimArrowMesh;

  private isDragging: boolean = false;
  private isOrbiting: boolean = false;
  private enabled: boolean = true;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;

  private raycaster: THREE.Raycaster;
  private groundPlane: THREE.Plane;
  private dragStartPoint: THREE.Vector3 = new THREE.Vector3();
  private currentDragPoint: THREE.Vector3 = new THREE.Vector3();
  private shotDirection: THREE.Vector3 = new THREE.Vector3();
  private currentRawPower: number = 0;
  private lastPowerTier: number = 0;
  private lastJitterAngle: number = 0;

  private maxDragDistance: number = 2.4; // 2.4m pullback reaches 100% even at default 29° camera pitch
  private maxImpulseForce: number = MAX_IMPULSE_FORCE; // Calibrated for ~5g golf ball (up to ~20m ramp jump-overs)

  public onStrokeTaken?: (power: number, impulse: THREE.Vector3) => void;
  public onPowerThreshold?: (tier: number) => void;

  constructor(
    canvas: HTMLCanvasElement,
    camera: THREE.Camera,
    scene: THREE.Scene,
    ball: BallController,
    cameraController?: CameraController,
    options?: SlingshotInputOptions
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.ball = ball;
    this.cameraController = cameraController;
    this.eventTarget = options?.eventTarget ?? (typeof window !== "undefined" ? window : null);
    this.arrow = new AimArrowMesh();
    scene.add(this.arrow.group);

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    if (this.eventTarget) {
      this.eventTarget.addEventListener("pointermove", this.handlePointerMove);
      this.eventTarget.addEventListener("pointerup", this.handlePointerUp);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.isDragging = false;
      this.isOrbiting = false;
      this.currentRawPower = 0;
      this.lastPowerTier = 0;
      this.lastJitterAngle = 0;
      this.arrow.hide();
      this.canvas.style.cursor = "default";
    }
  }

  public isDraggingActive(): boolean {
    return this.isDragging;
  }

  private isPointerOverBallOrGhost(clientX: number, clientY: number): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const targets: THREE.Object3D[] = [this.ball.mesh];
    if (this.ball.ghostSphereMesh) targets.push(this.ball.ghostSphereMesh);
    if (this.raycaster.intersectObjects(targets, false).length > 0) {
      return true;
    }

    const point = this.getGroundIntersection(clientX, clientY);
    if (point) {
      return point.distanceTo(this.ball.getPosition()) < 0.8;
    }
    return false;
  }

  private handlePointerDown = (ev: PointerEvent): void => {
    if (!this.enabled) return;

    // Right or middle click triggers camera orbit
    if (ev.button === 2 || ev.button === 1) {
      this.isOrbiting = true;
      this.lastPointerX = ev.clientX;
      this.lastPointerY = ev.clientY;
      return;
    }

    if (ev.button !== 0) return; // Left mouse button only beyond here

    if (this.ball.state === "aiming" && this.isPointerOverBallOrGhost(ev.clientX, ev.clientY)) {
      const ballPos = this.ball.getPosition();
      this.isDragging = true;
      this.lastPowerTier = 0;
      this.dragStartPoint.copy(ballPos);
      this.currentDragPoint.copy(ballPos);
      this.canvas.style.cursor = "grabbing";
      return;
    }

    // Clicking anywhere else on canvas orbits the camera
    this.isOrbiting = true;
    this.lastPointerX = ev.clientX;
    this.lastPointerY = ev.clientY;
  };

  private handlePointerMove = (ev: PointerEvent): void => {
    if (!this.enabled) return;

    if (this.isDragging && this.ball.state === "aiming") {
      const point = this.getGroundIntersection(ev.clientX, ev.clientY);
      if (!point) return;

      this.currentDragPoint.copy(point);
      const ballPos = this.ball.getPosition();

      // Slingshot: Dragging backward aims forward!
      const dragVec = new THREE.Vector3().subVectors(ballPos, this.currentDragPoint);
      dragVec.y = 0;

      const dist = dragVec.length();
      const power = Math.min(dist / this.maxDragDistance, 1.0);
      this.currentRawPower = power;

      if (dist > 0.05) {
        this.shotDirection.copy(dragVec).normalize();
        const timeSec = performance.now() / 1000;
        const curvedPower = computeCurvedPower(power);
        this.lastJitterAngle = computeAimJitterAngle(power, timeSec);
        this.arrow.update(ballPos, this.shotDirection, curvedPower, timeSec, this.lastJitterAngle);

        const tier = power >= 0.99 ? 4 : Math.floor(power * 4);
        if (tier > 0 && tier !== this.lastPowerTier) {
          this.lastPowerTier = tier;
          this.onPowerThreshold?.(tier);
        } else if (tier === 0) {
          this.lastPowerTier = 0;
        }
      } else {
        this.lastPowerTier = 0;
        this.lastJitterAngle = 0;
        this.arrow.hide();
      }
    } else if (this.isOrbiting && this.cameraController) {
      const dx = ev.clientX - this.lastPointerX;
      const dy = ev.clientY - this.lastPointerY;
      this.lastPointerX = ev.clientX;
      this.lastPointerY = ev.clientY;
      this.cameraController.handleOrbitDrag(dx, dy);
    } else if (this.ball.state === "aiming") {
      this.canvas.style.cursor = this.isPointerOverBallOrGhost(ev.clientX, ev.clientY)
        ? "grab"
        : "default";
    } else {
      this.canvas.style.cursor = "default";
    }
  };

  /**
   * Keeps high-power aim jitter oscillating while the player holds at > 85% power
   * so release direction stays locked 1:1 with the visible arrow.
   */
  public updateAimVisual(timeSec: number = performance.now() / 1000): void {
    if (!this.enabled || !this.isDragging || this.ball.state !== "aiming") return;
    if (this.currentRawPower <= 0.02 || this.shotDirection.lengthSq() < 1e-6) return;

    const curvedPower = computeCurvedPower(this.currentRawPower);
    this.lastJitterAngle = computeAimJitterAngle(this.currentRawPower, timeSec);
    this.arrow.update(
      this.ball.getPosition(),
      this.shotDirection,
      curvedPower,
      timeSec,
      this.lastJitterAngle
    );
  }

  private handlePointerUp = (): void => {
    if (!this.enabled) {
      this.isDragging = false;
      this.isOrbiting = false;
      this.arrow.hide();
      this.canvas.style.cursor = "default";
      return;
    }

    if (this.isOrbiting) {
      this.isOrbiting = false;
    }

    if (!this.isDragging) return;
    this.isDragging = false;
    this.arrow.hide();
    this.canvas.style.cursor = "default";

    if (this.ball.state !== "aiming") return;

    const ballPos = this.ball.getPosition();
    const dragVec = new THREE.Vector3().subVectors(ballPos, this.currentDragPoint);
    dragVec.y = 0;

    const dist = dragVec.length();
    const power = Math.min(dist / this.maxDragDistance, 1.0);

    if (power > 0.05) {
      // Launch along the exact live angle the 3D aim arrow was pointing at release
      const dir = this.shotDirection.clone();
      if (this.lastJitterAngle !== 0) {
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.lastJitterAngle);
      }

      const curvedPower = computeCurvedPower(power);
      const impulseMagnitude = curvedPower * this.maxImpulseForce;
      const impulse = dir.multiplyScalar(impulseMagnitude);

      this.currentRawPower = 0;
      this.lastPowerTier = 0;
      this.lastJitterAngle = 0;
      this.ball.shoot(impulse);
      this.onStrokeTaken?.(power, impulse);
    } else {
      this.currentRawPower = 0;
      this.lastPowerTier = 0;
      this.lastJitterAngle = 0;
    }
  };

  private getGroundIntersection(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    // Align ground plane with ball elevation
    this.groundPlane.constant = -this.ball.getPosition().y;

    const target = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.groundPlane, target);
  }

  public dispose(): void {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    if (this.eventTarget) {
      this.eventTarget.removeEventListener("pointermove", this.handlePointerMove);
      this.eventTarget.removeEventListener("pointerup", this.handlePointerUp);
    }
    this.arrow.hide();
  }
}

