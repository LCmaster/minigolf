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

    // 4. Test cup sink at cup bottom and immediate ball stop during stepFrame
    const cupBottomPos =
      engine.courseManager.getCupBottomPosition() || engine.courseManager.getGoalPosition()!;
    engine.ballController.rigidBody.setTranslation(
      { x: cupBottomPos.x + 0.1, y: cupBottomPos.y + 0.1, z: cupBottomPos.z },
      true
    );
    engine.stepFrame(1 / 60);
    expect(cupSinkEvents.length).toBe(1);
    expect(engine.ballController.state).toBe("in_hole");
    expect(engine.cameraController.mode).toBe("cup_zoom");
    const sunkVel = engine.ballController.rigidBody.linvel();
    expect(Math.hypot(sunkVel.x, sunkVel.y, sunkVel.z)).toBe(0);

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
  it("animates booster visuals every frame and flashes them when a booster is triggered", async () => {
    const engine = new GameEngine(undefined, { headless: true });
    vi.spyOn(engine.assetLoader, "init").mockImplementation(async () => {});
    vi.spyOn(engine.assetLoader, "getPiece").mockImplementation((id: string) => {
      if (id.includes("tee")) return MockFactories.createMockPiece(id, { isTee: true });
      if (id.includes("cup")) return MockFactories.createMockPiece(id, { isCup: true });
      return MockFactories.createMockPiece(id);
    });
    await engine.init();
    engine.loadTestHole();

    const animateSpy = vi.spyOn(engine.courseManager, "updateBoosterVisuals");
    engine.stepFrame(1 / 60);
    expect(animateSpy).toHaveBeenCalledTimes(1);
    expect(animateSpy.mock.calls[0][1]).toBeCloseTo(1 / 60, 5);

    // Editor mode (no physics) still animates the chevrons
    engine.setEditorMode(true);
    engine.stepFrame(1 / 60);
    expect(animateSpy).toHaveBeenCalledTimes(2);
    engine.setEditorMode(false);

    const flash = vi.fn();
    engine.triggerBooster({
      direction: new THREE.Vector3(0, 0, -1),
      impulse: 0.038,
      center: new THREE.Vector3(),
      visuals: { triggerFlash: flash } as any,
    });
    expect(flash).toHaveBeenCalledTimes(1);

    engine.dispose();
  });

  it("respawns ball to last safe position, plays water splash, and emits outOfBounds(reason='water') when ball touches pond water", async () => {
    const engine = new GameEngine(undefined, { headless: true });
    vi.spyOn(engine.assetLoader, "init").mockImplementation(async () => {});
    vi.spyOn(engine.assetLoader, "getPiece").mockImplementation((id: string) => {
      if (id === "terrain_pond_patch_6x6") {
        const waterPlane = new THREE.PlaneGeometry(5, 5);
        waterPlane.rotateX(-Math.PI / 2);
        return {
          ...MockFactories.createMockPiece(id),
          ubxWaterGeometries: [waterPlane],
        };
      }
      if (id.includes("tee")) return MockFactories.createMockPiece(id, { isTee: true });
      if (id.includes("cup")) return MockFactories.createMockPiece(id, { isCup: true });
      return MockFactories.createMockPiece(id);
    });

    await engine.init();
    engine.loadTestHole();
    engine.courseManager.addProp({
      instanceId: "test_pond",
      propId: "terrain_pond_patch_6x6",
      position: [12, 0.1, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    });

    const oobEvents: any[] = [];
    engine.on("outOfBounds", (ev) => oobEvents.push(ev));
    const splashSpy = vi.spyOn(engine.audio, "playWaterSplash").mockImplementation(() => {});

    const safePos = engine.ballController.getPosition().clone();
    engine.ballController.shoot(new THREE.Vector3(0, 0, -0.02));
    expect(engine.ballController.strokes).toBe(1);

    // Drop the ball directly above the pond water plane at Y = 0.1
    engine.ballController.rigidBody.setTranslation({ x: 12, y: 0.25, z: 0 }, true);
    engine.ballController.rigidBody.setLinvel({ x: 0, y: -1.5, z: 0 }, true);
    for (let i = 0; i < 15; i++) {
      engine.stepFrame(1 / 60);
      if (oobEvents.length > 0) break;
    }

    expect(splashSpy).toHaveBeenCalledTimes(1);
    expect(oobEvents).toHaveLength(1);
    expect(oobEvents[0].reason).toBe("water");
    expect(engine.ballController.state).toBe("aiming");
    expect(engine.ballController.strokes).toBe(1);
    expect(engine.ballController.getPosition().x).toBeCloseTo(safePos.x, 2);
    expect(engine.ballController.getPosition().z).toBeCloseTo(safePos.z, 2);

    engine.dispose();
  });

  it("gates rolling audio by ground contact, uses playBooster on boosters, passes hole par to cupSink/playCupSink, and disposes audio", async () => {
    const engine = new GameEngine(undefined, { headless: true });
    vi.spyOn(engine.assetLoader, "init").mockImplementation(async () => {});
    vi.spyOn(engine.assetLoader, "getPiece").mockImplementation((id: string) => {
      if (id.includes("tee")) return MockFactories.createMockPiece(id, { isTee: true });
      if (id.includes("cup")) return MockFactories.createMockPiece(id, { isCup: true });
      return MockFactories.createMockPiece(id);
    });
    await engine.init();

    // Load a Par-4 hole #7 so cupSink & playCupSink reflect course metadata
    engine.courseManager.loadHole({
      holeNumber: 7,
      par: 4,
      teeTileId: "t_tee",
      cupTileId: "t_cup",
      tiles: [
        { instanceId: "t_tee", kitPieceId: "tile_tee", position: [0, 0, 0], walls: { left: true, right: true } },
        { instanceId: "t_cup", kitPieceId: "tile_cup", attachedTo: { parentInstanceId: "t_tee", parentSocketId: "LOC_Socket_Out" }, walls: { left: true, right: true } },
      ],
    });
    engine.ballController.createPhysicsBody(engine.courseManager.spawnPosition);

    // 1. triggerBooster uses playBooster rather than playBumper
    const boosterSpy = vi.spyOn(engine.audio, "playBooster").mockImplementation(() => {});
    const bumperSpy = vi.spyOn(engine.audio, "playBumper").mockImplementation(() => {});
    engine.triggerBooster({
      direction: new THREE.Vector3(0, 0, -1),
      impulse: 0.038,
      center: new THREE.Vector3(),
    });
    expect(boosterSpy).toHaveBeenCalledTimes(1);
    expect(bumperSpy).not.toHaveBeenCalled();

    // 2. Grounded rolling vs airborne silence gating
    const rollingSpy = vi.spyOn(engine.audio, "updateRolling");
    engine.ballController.state = "moving";
    // Welded floor top in MockFactories is Y = 1.0 (ball radius = 0.1 -> Y = 1.095 contacts floor)
    engine.ballController.rigidBody.setTranslation({ x: 0, y: 1.095, z: 0 }, true);
    engine.ballController.rigidBody.setLinvel({ x: 0, y: -0.2, z: -4.0 }, true);
    engine.stepFrame(1 / 60);
    const groundedCall = rollingSpy.mock.calls.at(-1)!;
    expect(groundedCall[0]).toBeGreaterThan(2.0);
    expect(groundedCall[1]).toBe(true);

    // Lift ball high into the air -> isGrounded must be false
    engine.ballController.rigidBody.setTranslation({ x: 0, y: 3.0, z: 0 }, true);
    engine.ballController.rigidBody.setLinvel({ x: 0, y: 1.0, z: -4.0 }, true);
    engine.stepFrame(1 / 60);
    const airCall = rollingSpy.mock.calls.at(-1)!;
    expect(airCall[0]).toBeGreaterThan(2.0);
    expect(airCall[1]).toBe(false);

    // 3. Cup sink forwards Par-or-better flag to audio.playCupSink and hole par to cupSink event
    const cupEvents: any[] = [];
    engine.on("cupSink", (ev) => cupEvents.push(ev));
    const cupAudioSpy = vi.spyOn(engine.audio, "playCupSink").mockImplementation(() => {});

    engine.ballController.strokes = 3; // Under Par 4 -> birdie (isParOrBetter = true)
    const cupPos = engine.courseManager.getCupBottomPosition() || engine.courseManager.getGoalPosition()!;
    engine.ballController.rigidBody.setTranslation({ x: cupPos.x, y: cupPos.y + 0.05, z: cupPos.z }, true);
    engine.stepFrame(1 / 60);

    expect(cupAudioSpy).toHaveBeenCalledWith(true);
    expect(cupEvents).toHaveLength(1);
    expect(cupEvents[0]).toMatchObject({ holeNumber: 7, par: 4, totalStrokes: 3, scoreRelative: -1 });

    // 4. dispose() disposes AudioManager
    const disposeSpy = vi.spyOn(engine.audio, "dispose");
    engine.dispose();
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });
});
