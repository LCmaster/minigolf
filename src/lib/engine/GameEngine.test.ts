import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { GameEngine } from "./GameEngine";
import { MockFactories } from "../../../tests/helpers/MockFactories";

describe("GameEngine Headless Orchestrator Tests", () => {
  it("initializes all subsystems, loads test hole, steps frames, and emits lifecycle events", async () => {
    const engine = new GameEngine(undefined, { headless: true });

    // Stub AssetLoader.init to populate mock pieces instead of network fetch
    vi.spyOn(engine.assetLoader, "init").mockImplementation(async () => {});
    vi.spyOn(engine.assetLoader, "getPiece").mockImplementation((id: string) => {
      if (id.includes("tee")) return MockFactories.createMockPiece(id, { isTee: true });
      if (id.includes("cup")) return MockFactories.createMockPiece(id, { isCup: true });
      return MockFactories.createMockPiece(id);
    });

    await engine.init();

    expect(engine.courseManager).toBeDefined();
    expect(engine.ballController).toBeDefined();
    expect(engine.cameraController).toBeDefined();
    expect(engine.slingshotInput).toBeDefined();

    // Load test hole
    engine.loadTestHole();
    expect(engine.courseManager.getGoalPosition()).not.toBeNull();

    // Register event listeners
    const fpsEvents: number[] = [];
    const cupSinkEvents: any[] = [];
    const oobEvents: any[] = [];
    const strokeEvents: any[] = [];

    engine.on("fpsUpdate", (fps) => fpsEvents.push(fps));
    engine.on("cupSink", (ev) => cupSinkEvents.push(ev));
    engine.on("outOfBounds", (ev) => oobEvents.push(ev));
    engine.on("strokeTaken", (ev) => strokeEvents.push(ev));

    // 1. Trigger stroke via slingshot callback (25% power putt: 0.02 impulse)
    engine.ballController.shoot(new THREE.Vector3(0, 0, -0.02));
    engine.slingshotInput.onStrokeTaken?.(0.25, new THREE.Vector3(0, 0, -0.02));
    expect(strokeEvents.length).toBe(1);
    expect(strokeEvents[0].strokeNumber).toBe(1);

    // 2. Step 65 frames (at 1/60s each -> > 1.0s) to trigger fpsUpdate
    for (let i = 0; i < 65; i++) {
      engine.stepFrame(1 / 60);
    }
    expect(fpsEvents.length).toBeGreaterThanOrEqual(1);

    // 3. Test out-of-bounds recovery during stepFrame
    engine.ballController.rigidBody.setTranslation({ x: 0, y: -6.0, z: 0 }, true);
    engine.stepFrame(1 / 60);
    expect(oobEvents.length).toBe(1);
    expect(engine.ballController.state).toBe("aiming");

    // 4. Test cup sink via proximity during stepFrame
    const goalPos = engine.courseManager.getGoalPosition()!;
    engine.ballController.rigidBody.setTranslation(
      { x: goalPos.x + 0.1, y: goalPos.y + 0.1, z: goalPos.z },
      true
    );
    engine.stepFrame(1 / 60);
    expect(cupSinkEvents.length).toBe(1);
    expect(engine.ballController.state).toBe("in_hole");
    expect(engine.cameraController.mode).toBe("cup_zoom");

    // 5. Start and stop loop cleanly
    engine.start();
    engine.stop();
    engine.dispose();
  });

  it("hides ball, disables physics/slingshot, and enables free-roam camera in editor mode", async () => {
    const engine = new GameEngine(undefined, { headless: true });
    vi.spyOn(engine.assetLoader, "init").mockImplementation(async () => {});
    vi.spyOn(engine.assetLoader, "getPiece").mockImplementation((id: string) => {
      if (id.includes("tee")) return MockFactories.createMockPiece(id, { isTee: true });
      if (id.includes("cup")) return MockFactories.createMockPiece(id, { isCup: true });
      return MockFactories.createMockPiece(id);
    });

    await engine.init();
    engine.loadTestHole();
    engine.setEditorMode(true);

    expect(engine.isEditorMode).toBe(true);
    expect(engine.ballController.mesh.visible).toBe(false);
    expect(engine.ballController.rigidBody).toBeUndefined();
    expect(engine.cameraController.mode).toBe("editor_free");

    // Panning free camera in editor mode must NOT be overwritten by stepFrame
    engine.cameraController.panBy(10, 8);
    const pannedTarget = engine.cameraController.target.clone();
    engine.stepFrame(1 / 60);
    expect(engine.cameraController.target.distanceTo(pannedTarget)).toBeLessThan(0.01);

    // Switching back to playtest mode spawns the ball and restores aiming camera
    engine.setEditorMode(false);
    expect(engine.isEditorMode).toBe(false);
    expect(engine.ballController.mesh.visible).toBe(true);
    expect(engine.ballController.rigidBody).toBeDefined();
    expect(engine.cameraController.mode).toBe("aiming");

    engine.dispose();
  });
});
