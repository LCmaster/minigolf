import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { CameraController } from "./CameraController";

describe("CameraController Dual-Pitch & Orbit (TDD)", () => {
  it("interpolates coupled pitch angle and distance correctly between 12.5° and 60°", () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const controller = new CameraController(camera);

    controller.setPitchProgress(0.0);
    expect(controller.pitchAngleDeg).toBeCloseTo(12.5, 1);
    expect(controller.orbitDistance).toBeCloseTo(4.5, 1);

    controller.setPitchProgress(1.0);
    expect(controller.pitchAngleDeg).toBeCloseTo(60.0, 1);
    expect(controller.orbitDistance).toBeCloseTo(8.0, 1);

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

    controller.setTarget(new THREE.Vector3(0, 0, 10));
    controller.update(0.016, 5.0);

    expect(camera.position.z).toBeGreaterThan(startPos.z);
    expect(camera.position.z).toBeLessThan(10 + startPos.z);
  });

  it("handles intro flyover animation and skipping", () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const controller = new CameraController(camera);

    const teePos = new THREE.Vector3(0, 0, 10);
    const cupPos = new THREE.Vector3(0, 0, -10);

    controller.playIntroFlyover(teePos, cupPos, 2.0);
    expect(controller.mode).toBe("flyover");
    expect(camera.position.z).toBeCloseTo(4, 1);

    controller.update(1.0);
    expect(controller.mode).toBe("flyover");

    controller.update(1.1);
    expect(controller.mode).toBe("aiming");
    expect(camera.position.z).toBeGreaterThan(10);
  });

  it("toggles overview mode and back", () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const controller = new CameraController(camera);

    controller.setPitchProgress(0.35);
    controller.toggleOverview();

    expect(controller.mode).toBe("overview");
    expect(controller.pitchAngleDeg).toBeCloseTo(60.0, 1);

    controller.toggleOverview();
    expect(controller.mode).toBe("aiming");
    expect(controller.pitchAngleDeg).toBeCloseTo(12.5 + 0.35 * (60.0 - 12.5), 1);
  });

  it("supports free-roam editor panning, wider zoom range (4m..65m), and framing", () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    const controller = new CameraController(camera);
    controller.mode = "editor_free";
    controller.setTarget(new THREE.Vector3(0, 0, 0));
    controller.setEditorView(20, 45);
    controller.snapToTarget();

    // Zoom scroll widens/narrows orbit distance freely up to 65m
    controller.handleZoomScroll(400);
    expect(controller.orbitDistance).toBeCloseTo(30, 1);
    controller.handleZoomScroll(4000);
    expect(controller.orbitDistance).toBe(65);
    controller.handleZoomScroll(-4000);
    expect(controller.orbitDistance).toBe(4);

    // Panning moves target along ground plane freely
    controller.panBy(10, 5);
    expect(controller.target.z).toBeCloseTo(-10, 2);
    expect(controller.target.x).toBeCloseTo(5, 2);

    // Framing centers target on course bounds
    controller.frameBounds(new THREE.Vector3(12, 1, -6), 24);
    expect(controller.target.x).toBeCloseTo(12, 2);
    expect(controller.target.z).toBeCloseTo(-6, 2);
    expect(controller.orbitDistance).toBeGreaterThan(20);

    controller.dispose();
  });

  it("supports continuous turntable orbit mode around course target", () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    const controller = new CameraController(camera);

    controller.mode = "turntable";
    controller.setTarget(new THREE.Vector3(0, 1, -10));
    controller.setEditorView(26, 26);
    controller.snapToTarget();

    const startPos = camera.position.clone();
    const startDist = startPos.distanceTo(controller.target);
    expect(startDist).toBeCloseTo(26, 2);

    for (let i = 0; i < 10; i++) {
      controller.update(0.1);
    }
    const nextPos = camera.position.clone();
    expect(nextPos.distanceTo(controller.target)).toBeCloseTo(26, 2);
    expect(Math.hypot(nextPos.x - startPos.x, nextPos.z - startPos.z)).toBeGreaterThan(1.0);
    expect(nextPos.y).toBeCloseTo(startPos.y, 3);

    controller.dispose();
  });

  it("aligns camera heading with given forward direction", () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const controller = new CameraController(camera);
    const target = new THREE.Vector3(0, 0, 0);
    controller.setTarget(target);

    // Heading pointing in +X: camera should be placed behind target at -X, looking toward +X
    controller.setHeading(new THREE.Vector3(1, 0, 0));
    controller.snapToTarget();

    expect(camera.position.x).toBeLessThan(0);
    expect(camera.position.z).toBeCloseTo(0, 1);

    // Heading pointing in +Z: camera should be placed at -Z, looking toward +Z
    controller.setHeading(new THREE.Vector3(0, 0, 1));
    controller.snapToTarget();

    expect(camera.position.z).toBeLessThan(0);
    expect(camera.position.x).toBeCloseTo(0, 1);
  });

  it("honors initialHeading during playIntroFlyover", () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const controller = new CameraController(camera);
    const teePos = new THREE.Vector3(0, 0, 0);
    const cupPos = new THREE.Vector3(0, 0, 10);
    const initialHeading = new THREE.Vector3(1, 0, 0); // Along +X

    controller.playIntroFlyover(teePos, cupPos, 1.0, initialHeading);
    controller.skipFlyover();

    // After flyover, camera must sit behind the tee (at -X) looking along +X
    expect(camera.position.x).toBeLessThan(0);
    expect(camera.position.z).toBeCloseTo(0, 1);
  });
});

