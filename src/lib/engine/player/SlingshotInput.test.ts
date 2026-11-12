import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import {
  SlingshotInput,
  computeCurvedPower,
  computeAimJitterAngle,
  MAX_IMPULSE_FORCE,
} from "./SlingshotInput";

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

  it("applies progressive exponential curve (gentle close putts, 0.18 max jump power) and launches along live jittered arrow angle", () => {
    expect(computeCurvedPower(0)).toBeCloseTo(0, 5);
    expect(computeCurvedPower(0.25)).toBeLessThan(0.10);
    expect(computeCurvedPower(0.5)).toBeCloseTo(0.214, 2);
    expect(computeCurvedPower(1.0)).toBeCloseTo(1.0, 5);
    expect(MAX_IMPULSE_FORCE).toBeCloseTo(0.18, 4);

    // Zero jitter below 85% raw power; deterministic jitter above 85%
    expect(computeAimJitterAngle(0.5, 0.04)).toBe(0);
    expect(Math.abs(computeAimJitterAngle(1.0, 0.04))).toBeGreaterThan(0.05);

    camera.position.set(0, 5, 5);
    camera.lookAt(0, 0.2, 0);
    camera.updateMatrixWorld();

    const listeners = new Map<string, (ev: any) => void>();
    const eventTarget = {
      addEventListener: vi.fn((type: string, cb: (ev: any) => void) => {
        listeners.set(type, cb);
      }),
      removeEventListener: vi.fn((type: string) => {
        listeners.delete(type);
      }),
    };

    const input = new SlingshotInput(canvasMock, camera, scene, ballMock, undefined, {
      eventTarget,
    });
    const pointerdown = canvasMock.addEventListener.mock.calls.find(
      (c: any[]) => c[0] === "pointerdown"
    )[1];

    expect(eventTarget.addEventListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(eventTarget.addEventListener).toHaveBeenCalledWith("pointerup", expect.any(Function));

    // Full pullback (>85% power) and tick aim visual at a timestamp with non-zero jitter
    pointerdown({ button: 0, clientX: 400, clientY: 300 });
    listeners.get("pointermove")!({ clientX: 400, clientY: 590 });
    input.updateAimVisual(0.04); // sin(0.04 * 36) ≈ +0.99

    const expectedArrowDir = new THREE.Vector3(0, 0, -1)
      .applyEuler(input.arrow.group.rotation)
      .normalize();
    expect(Math.abs(expectedArrowDir.x)).toBeGreaterThan(0.03); // Visible jitter offset

    listeners.get("pointerup")!({});

    expect(ballMock.shoot).toHaveBeenCalledTimes(1);
    const maxImpulse = ballMock.shoot.mock.calls[0][0] as THREE.Vector3;
    expect(maxImpulse.length()).toBeGreaterThan(0.12);
    expect(maxImpulse.length()).toBeLessThanOrEqual(MAX_IMPULSE_FORCE + 1e-6);

    // Ball launches along the exact live angle the 3D arrow was pointing at release
    const launchDir = maxImpulse.clone().normalize();
    expect(launchDir.distanceTo(expectedArrowDir)).toBeLessThan(1e-4);

    // Gentle short pullback produces very low impulse for precision close putts without jitter
    ballMock.shoot.mockClear();
    pointerdown({ button: 0, clientX: 400, clientY: 300 });
    listeners.get("pointermove")!({ clientX: 400, clientY: 330 });
    listeners.get("pointerup")!({});

    expect(ballMock.shoot).toHaveBeenCalledTimes(1);
    const gentleImpulse = ballMock.shoot.mock.calls[0][0] as THREE.Vector3;
    expect(gentleImpulse.length()).toBeGreaterThan(0.001);
    expect(gentleImpulse.length()).toBeLessThan(0.025);

    input.dispose();
    expect(eventTarget.removeEventListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(eventTarget.removeEventListener).toHaveBeenCalledWith("pointerup", expect.any(Function));
  });
});

