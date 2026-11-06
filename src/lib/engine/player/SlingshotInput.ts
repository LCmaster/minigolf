/**
 * SlingshotInput.ts
 * Drag-and-aim slingshot input handler for mouse and touch.
 */

import * as THREE from "three";
import type { BallController } from "./BallController";
import { AimArrowMesh } from "./AimArrowMesh";

export class SlingshotInput {
  private canvas: HTMLCanvasElement;
  private camera: THREE.Camera;
  private ball: BallController;
  public arrow: AimArrowMesh;

  private isDragging: boolean = false;
  private raycaster: THREE.Raycaster;
  private groundPlane: THREE.Plane;
  private dragStartPoint: THREE.Vector3 = new THREE.Vector3();
  private currentDragPoint: THREE.Vector3 = new THREE.Vector3();
  private shotDirection: THREE.Vector3 = new THREE.Vector3();

  private maxDragDistance: number = 4.0; // 4 meters max drag for 100% power
  private maxImpulseForce: number = 0.55; // Calibrated for 0.045kg ball over 4m grid

  public onStrokeTaken?: (power: number, impulse: THREE.Vector3) => void;

  constructor(
    canvas: HTMLCanvasElement,
    camera: THREE.Camera,
    scene: THREE.Scene,
    ball: BallController
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.ball = ball;
    this.arrow = new AimArrowMesh();
    scene.add(this.arrow.group);

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
  }

  private handlePointerDown = (ev: PointerEvent): void => {
    if (this.ball.state !== "aiming") return;
    if (ev.button !== 0) return; // Left mouse button only

    const point = this.getGroundIntersection(ev.clientX, ev.clientY);
    if (!point) return;

    const ballPos = this.ball.getPosition();
    const distToBall = point.distanceTo(ballPos);

    // Click near ball (within 2m radius for generous mobile/touch target)
    if (distToBall < 2.0) {
      this.isDragging = true;
      this.dragStartPoint.copy(ballPos);
      this.currentDragPoint.copy(ballPos);
    }
  };

  private handlePointerMove = (ev: PointerEvent): void => {
    if (!this.isDragging || this.ball.state !== "aiming") return;

    const point = this.getGroundIntersection(ev.clientX, ev.clientY);
    if (!point) return;

    this.currentDragPoint.copy(point);
    const ballPos = this.ball.getPosition();

    // In direct slingshot: Dragging backward aims forward!
    const dragVec = new THREE.Vector3().subVectors(ballPos, this.currentDragPoint);
    dragVec.y = 0; // Pure planar shot

    const dist = dragVec.length();
    const power = Math.min(dist / this.maxDragDistance, 1.0);

    if (dist > 0.05) {
      this.shotDirection.copy(dragVec).normalize();
      this.arrow.update(ballPos, this.shotDirection, power, performance.now() / 1000);
    } else {
      this.arrow.hide();
    }
  };

  private handlePointerUp = (): void => {
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
      // Calculate shot direction and apply aim jitter if power > 0.75
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
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.arrow.hide();
  }
}

