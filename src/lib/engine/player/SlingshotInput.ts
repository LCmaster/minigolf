/**
 * SlingshotInput.ts
 * Drag-and-aim slingshot input handler for mouse and touch.
 */

import * as THREE from "three";
import type { BallController } from "./BallController";
import type { CameraController } from "../scene/CameraController";
import { AimArrowMesh } from "./AimArrowMesh";

export class SlingshotInput {
  private canvas: HTMLCanvasElement;
  private camera: THREE.Camera;
  private ball: BallController;
  private cameraController?: CameraController;
  public arrow: AimArrowMesh;

  private isDragging: boolean = false;
  private isOrbiting: boolean = false;
  private lastPointerX: number = 0;
  private lastPointerY: number = 0;

  private raycaster: THREE.Raycaster;
  private groundPlane: THREE.Plane;
  private dragStartPoint: THREE.Vector3 = new THREE.Vector3();
  private currentDragPoint: THREE.Vector3 = new THREE.Vector3();
  private shotDirection: THREE.Vector3 = new THREE.Vector3();

  private maxDragDistance: number = 4.0; // 4 meters max drag for 100% power
  private maxImpulseForce: number = 0.75; // Calibrated for arcade 6x6m tracks

  public onStrokeTaken?: (power: number, impulse: THREE.Vector3) => void;

  constructor(
    canvas: HTMLCanvasElement,
    camera: THREE.Camera,
    scene: THREE.Scene,
    ball: BallController,
    cameraController?: CameraController
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.ball = ball;
    this.cameraController = cameraController;
    this.arrow = new AimArrowMesh();
    scene.add(this.arrow.group);

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    if (typeof window !== "undefined") {
      window.addEventListener("pointermove", this.handlePointerMove);
      window.addEventListener("pointerup", this.handlePointerUp);
    }
  }

  private handlePointerDown = (ev: PointerEvent): void => {
    // Right or middle click triggers camera orbit
    if (ev.button === 2 || ev.button === 1) {
      this.isOrbiting = true;
      this.lastPointerX = ev.clientX;
      this.lastPointerY = ev.clientY;
      return;
    }

    if (ev.button !== 0) return; // Left mouse button only beyond here

    if (this.ball.state === "aiming") {
      const point = this.getGroundIntersection(ev.clientX, ev.clientY);
      if (point) {
        const ballPos = this.ball.getPosition();
        const distToBall = point.distanceTo(ballPos);

        // Click near ball (< 0.8m) starts slingshot aiming
        if (distToBall < 0.8) {
          this.isDragging = true;
          this.dragStartPoint.copy(ballPos);
          this.currentDragPoint.copy(ballPos);
          return;
        }
      }
    }

    // Clicking anywhere else on canvas orbits the camera
    this.isOrbiting = true;
    this.lastPointerX = ev.clientX;
    this.lastPointerY = ev.clientY;
  };

  private handlePointerMove = (ev: PointerEvent): void => {
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

      if (dist > 0.05) {
        this.shotDirection.copy(dragVec).normalize();
        this.arrow.update(ballPos, this.shotDirection, power, performance.now() / 1000);
      } else {
        this.arrow.hide();
      }
    } else if (this.isOrbiting && this.cameraController) {
      const dx = ev.clientX - this.lastPointerX;
      const dy = ev.clientY - this.lastPointerY;
      this.lastPointerX = ev.clientX;
      this.lastPointerY = ev.clientY;
      this.cameraController.handleOrbitDrag(dx, dy);
    }
  };

  private handlePointerUp = (): void => {
    if (this.isOrbiting) {
      this.isOrbiting = false;
    }

    if (!this.isDragging) return;
    this.isDragging = false;
    this.arrow.hide();

    if (this.ball.state !== "aiming") return;

    const ballPos = this.ball.getPosition();
    const dragVec = new THREE.Vector3().subVectors(ballPos, this.currentDragPoint);
    dragVec.y = 0;

    const dist = dragVec.length();
    const power = Math.min(dist / this.maxDragDistance, 1.0);

    if (power > 0.05) {
      let dir = this.shotDirection.clone();
      if (power > 0.75) {
        const jitterFactor = (power - 0.75) / 0.25;
        const jitter = (Math.random() - 0.5) * 0.1 * jitterFactor;
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), jitter);
      }

      const impulseMagnitude = power * this.maxImpulseForce;
      const impulse = dir.multiplyScalar(impulseMagnitude);

      this.ball.shoot(impulse);
      this.onStrokeTaken?.(power, impulse);
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
    if (typeof window !== "undefined") {
      window.removeEventListener("pointermove", this.handlePointerMove);
      window.removeEventListener("pointerup", this.handlePointerUp);
    }
    this.arrow.hide();
  }
}

