import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { CameraController } from "../src/lib/engine/scene/CameraController";

describe("CameraController Dual-Pitch & Orbit (TDD)", () => {
  it("interpolates coupled pitch angle and distance correctly between 12.5° and 60°", () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const controller = new CameraController(camera);

    // Set pitch to 0.0 (low horizon aim view)
    controller.setPitchProgress(0.0);
    expect(controller.pitchAngleDeg).toBeCloseTo(12.5, 1);
    expect(controller.orbitDistance).toBeCloseTo(4.5, 1);

    // Set pitch to 1.0 (high approach view)
    controller.setPitchProgress(1.0);
    expect(controller.pitchAngleDeg).toBeCloseTo(60.0, 1);
    expect(controller.orbitDistance).toBeCloseTo(8.0, 1);

    // Intermediate 0.5
    controller.setPitchProgress(0.5);
    expect(controller.pitchAngleDeg).toBeCloseTo((12.5 + 60.0) / 2, 1);
    expect(controller.orbitDistance).toBeCloseTo((4.5 + 8.0) / 2, 1);
  });

  it("clamps pitch progress within [0.0, 1.0]", () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const controller = new CameraController(camera);

    controller.setPitchProgress(-0.5);
    expect(controller.pitchAngleDeg).toBeCloseTo(12.5, 1);

    controller.setPitchProgress(2.0);
    expect(controller.pitchAngleDeg).toBeCloseTo(60.0, 1);
  });

  it("smoothly damps towards ball target on update", () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const controller = new CameraController(camera);

    controller.setTarget(new THREE.Vector3(0, 0, 0));
    controller.snapToTarget();

    const startPos = camera.position.clone();

    // Target moves to (0, 0, 10)
    controller.setTarget(new THREE.Vector3(0, 0, 10));

    // Update with 16ms delta
    controller.update(0.016, 5.0);

    // Camera should have moved towards target but not instantly snapped
    expect(camera.position.z).toBeGreaterThan(startPos.z);
    expect(camera.position.z).toBeLessThan(10 + startPos.z);
  });
});
