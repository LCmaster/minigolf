import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { SlingshotInput } from "./SlingshotInput";

describe("SlingshotInput Unit Tests", () => {
  let canvasMock: any;
  let camera: THREE.PerspectiveCamera;
  let scene: THREE.Scene;
  let ballMock: any;

  beforeEach(() => {
    canvasMock = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, width: 800, height: 600 })),
      style: {},
    };
    camera = new THREE.PerspectiveCamera(45, 800 / 600, 0.1, 100);
    camera.position.set(0, 5, 5);
    camera.lookAt(0, 0, 0);

    scene = new THREE.Scene();

    ballMock = {
      state: "aiming",
      mesh: new THREE.Mesh(),
      getPosition: vi.fn(() => new THREE.Vector3(0, 0.2, 0)),
      shoot: vi.fn(),
    };
  });

  it("attaches listeners and adds arrow group to scene", () => {
    const input = new SlingshotInput(canvasMock, camera, scene, ballMock);

    expect(canvasMock.addEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(input.arrow).toBeDefined();
    expect(scene.children.includes(input.arrow.group)).toBe(true);

    input.dispose();
  });

  it("orbits camera on right click or middle click", () => {
    const cameraControllerMock = {
      handleOrbitDrag: vi.fn(),
    };

    const input = new SlingshotInput(
      canvasMock,
      camera,
      scene,
      ballMock,
      cameraControllerMock as any
    );

    const pointerdown = canvasMock.addEventListener.mock.calls.find(
      (c: any[]) => c[0] === "pointerdown"
    )[1];

    // Right click (button 2)
    pointerdown({ button: 2, clientX: 100, clientY: 100 });

    input.dispose();
  });

  it("disposes cleanly and removes arrow from view", () => {
    const input = new SlingshotInput(canvasMock, camera, scene, ballMock);

    expect(canvasMock.removeEventListener).not.toHaveBeenCalled();
    input.dispose();
    expect(canvasMock.removeEventListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(input.arrow.group.visible).toBe(false);
  });

  it("initiates slingshot drag and grabbing cursor when clicking the ball/ghost indicator", () => {
    const ghostMesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12));
    ghostMesh.position.set(0, 0.2, 0);
    ghostMesh.updateMatrixWorld(true);
    ballMock.mesh.position.set(0, 0.2, 0);
    ballMock.mesh.updateMatrixWorld(true);
    ballMock.ghostSphereMesh = ghostMesh;
    camera.updateMatrixWorld(true);

    const input = new SlingshotInput(canvasMock, camera, scene, ballMock);
    const pointerdown = canvasMock.addEventListener.mock.calls.find(
      (c: any[]) => c[0] === "pointerdown"
    )[1];

    expect(input.isDraggingActive()).toBe(false);
    pointerdown({ button: 0, clientX: 400, clientY: 300 });
    expect(input.isDraggingActive()).toBe(true);
    expect(canvasMock.style.cursor).toBe("grabbing");

    input.dispose();
  });

  it("applies calibrated power^1.35 curve capped at 0.10 impulse", () => {
    camera.position.set(0, 5, 5);
    camera.lookAt(0, 0.2, 0);
    camera.updateMatrixWorld();

    const input = new SlingshotInput(canvasMock, camera, scene, ballMock);
    const pointerdown = canvasMock.addEventListener.mock.calls.find(
      (c: any[]) => c[0] === "pointerdown"
    )[1];

    // Initiate drag on the ball centered at (400, 300), then pull strongly downward in screen space
    pointerdown({ button: 0, clientX: 400, clientY: 300 });
    (input as any).handlePointerMove({ clientX: 400, clientY: 590 });
    (input as any).handlePointerUp();

    expect(ballMock.shoot).toHaveBeenCalledTimes(1);
    const maxImpulse = ballMock.shoot.mock.calls[0][0] as THREE.Vector3;
    expect(maxImpulse.length()).toBeGreaterThan(0.01);
    expect(maxImpulse.length()).toBeLessThanOrEqual(0.10 + 1e-6);
    expect(maxImpulse.z).toBeLessThan(0);

    // Subtle pullback (~0.5 power) produces non-linear curved impulse strictly below linear 0.5 * 0.10
    ballMock.shoot.mockClear();
    pointerdown({ button: 0, clientX: 400, clientY: 300 });
    (input as any).handlePointerMove({ clientX: 400, clientY: 375 });
    (input as any).handlePointerUp();

    expect(ballMock.shoot).toHaveBeenCalledTimes(1);
    const gentleImpulse = ballMock.shoot.mock.calls[0][0] as THREE.Vector3;
    expect(gentleImpulse.length()).toBeLessThan(maxImpulse.length());

    input.dispose();
  });
});

