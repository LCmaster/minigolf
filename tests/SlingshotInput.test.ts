import { describe, it, expect, vi, beforeEach } from "vitest";
import * as THREE from "three";
import { SlingshotInput } from "../src/lib/engine/player/SlingshotInput";

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

    // Get pointerdown handler
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
});
