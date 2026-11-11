/**
 * GameEngine.ts
 * Master high-performance decoupled engine orchestrator for Mini Golf Mania.
 * Zero Svelte overhead in the 60/120fps render and physics loop.
 */

import * as THREE from "three";
import { RenderPipeline } from "./scene/RenderPipeline";
import { PhysicsWorld } from "./physics/PhysicsWorld";
import { AssetLoader } from "./kitbash/AssetLoader";
import { CourseManager } from "./course/CourseManager";
import { BallController } from "./player/BallController";
import { SlingshotInput } from "./player/SlingshotInput";
import { CameraController } from "./scene/CameraController";
import { AudioManager } from "./audio/AudioManager";
import type { EngineEventMap } from "./types/EngineEvents";
import type { HoleData } from "./types/CourseSchema";

export class GameEngine {
  public renderPipeline: RenderPipeline;
  public physicsWorld: PhysicsWorld;
  public assetLoader: AssetLoader;
  public courseManager!: CourseManager;
  public ballController!: BallController;
  public slingshotInput!: SlingshotInput;
  public cameraController!: CameraController;
  public audio: AudioManager;

  private isRunning: boolean = false;
  public isEditorMode: boolean = false;
  private savedEditorTarget: THREE.Vector3 | null = null;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private fpsCounter: number = 0;
  private fpsTimer: number = 0;
  private boosterCooldownTimer: number = 0;

  private eventListeners: { [K in keyof EngineEventMap]?: Function[] } = {};

  constructor(canvas?: HTMLCanvasElement, options?: { headless?: boolean }) {
    this.renderPipeline = new RenderPipeline(canvas, options);
    this.physicsWorld = new PhysicsWorld();
    this.assetLoader = new AssetLoader();
    this.audio = new AudioManager();
  }

  public async init(): Promise<void> {
    await this.physicsWorld.init();
    await this.assetLoader.init();

    this.courseManager = new CourseManager(
      this.renderPipeline.scene,
      this.physicsWorld.world,
      this.physicsWorld.rapier,
      this.assetLoader
    );

    this.courseManager.onHoleChanged = () => {
      this.renderPipeline.parkBackdrop.updateFromCourse(this.courseManager);
    };

    this.ballController = new BallController(
      this.renderPipeline.scene,
      this.physicsWorld.world,
      this.physicsWorld.rapier
    );

    this.cameraController = new CameraController(
      this.renderPipeline.camera,
      this.renderPipeline.renderer.domElement
    );

    this.slingshotInput = new SlingshotInput(
      this.renderPipeline.renderer.domElement,
      this.renderPipeline.camera,
      this.renderPipeline.scene,
      this.ballController,
      this.cameraController
    );

    this.slingshotInput.onStrokeTaken = (power, impulse) => {
      this.audio.playPutt(power);
      this.emit("strokeTaken", {
        holeNumber: 1,
        strokeNumber: this.ballController.strokes,
        power,
        impulse: [impulse.x, impulse.y, impulse.z],
      });
    };

    this.cameraController.onFrameRequested = () => {
      this.frameCameraOnCourse();
    };

    this.setupResizeListener();
  }

  /**
   * Switches between live gameplay and free-roam editor mode.
   * In editor mode, the golf ball, slingshot input, and ball-follow camera lock are disabled.
   */
  public setEditorMode(enabled: boolean): void {
    this.isEditorMode = enabled;
    if (enabled) {
      this.slingshotInput.setEnabled(false);
      this.ballController.setVisible(false);
      this.ballController.disablePhysics();
      this.cameraController.mode = "editor_free";
      if (this.savedEditorTarget) {
        this.cameraController.setTarget(this.savedEditorTarget);
        this.cameraController.snapToTarget();
      } else {
        this.frameCameraOnCourse();
      }
    } else {
      this.savedEditorTarget = this.cameraController.target.clone();
      this.ballController.setVisible(true);
      this.ballController.createPhysicsBody(this.courseManager.spawnPosition);
      this.slingshotInput.setEnabled(true);
      this.cameraController.mode = "aiming";
      this.cameraController.setTarget(this.courseManager.spawnPosition);
      this.cameraController.snapToTarget();
    }
  }

  public frameCameraOnCourse(): void {
    const tiles = this.courseManager.getAllTiles();
    if (tiles.length === 0) {
      this.cameraController.frameBounds(new THREE.Vector3(0, 0, 0), 14);
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const t of tiles) {
      const p = t.group.position;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    const center = new THREE.Vector3((minX + maxX) * 0.5, (minY + maxY) * 0.5, (minZ + maxZ) * 0.5);
    const span = Math.max(12, Math.hypot(maxX - minX + 8, maxZ - minZ + 8));
    this.cameraController.frameBounds(center, span * 0.65);
  }

  public on<K extends keyof EngineEventMap>(event: K, handler: EngineEventMap[K]): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event]!.push(handler);
  }

  public emit<K extends keyof EngineEventMap>(event: K, ...args: any[]): void {
    const handlers = this.eventListeners[event];
    if (handlers) {
      for (const handler of handlers) {
        handler(...args);
      }
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000.0;
    this.lastTime = currentTime;

    this.stepFrame(deltaTime);

    if (typeof requestAnimationFrame !== "undefined") {
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  };

  /**
   * Executes a single engine simulation and render frame.
   * Exposed for deterministic headless step testing.
   */
  public stepFrame(deltaTime: number): void {
    // FPS calculation
    this.fpsCounter++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1.0) {
      this.emit("fpsUpdate", this.fpsCounter);
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }

    // Step physics simulation (only active during play / playtest mode)
    if (this.isEditorMode) {
      this.cameraController.update(deltaTime, 0);
      this.renderPipeline.render();
      return;
    }

    this.physicsWorld.step(deltaTime);
    if (this.boosterCooldownTimer > 0) {
      this.boosterCooldownTimer = Math.max(0, this.boosterCooldownTimer - deltaTime);
    }

    // Update ball physics & visual transform
    this.ballController.update();

    // Check goal sensor collision, booster triggers, and bumper hits
    const goalCollider = this.courseManager.getGoalSensorCollider();
    const goalPos = this.courseManager.getGoalPosition();
    const ballHandle = this.ballController.collider?.handle;
    let ballEnteredHole = false;
    let pendingBooster: { direction: THREE.Vector3; impulse: number } | null = null;
    let hitBumper = false;

    this.physicsWorld.drainCollisionEvents((h1, h2, started) => {
      if (!started || ballHandle === undefined) return;
      if (h1 !== ballHandle && h2 !== ballHandle) return;
      const otherHandle = h1 === ballHandle ? h2 : h1;

      if (goalCollider && otherHandle === goalCollider.handle) {
        ballEnteredHole = true;
      }

      if (!pendingBooster && this.boosterCooldownTimer <= 0) {
        const booster = this.courseManager.getBoosterSensor(otherHandle);
        if (booster) {
          pendingBooster = booster;
        }
      }

      if (this.courseManager.isBumperCollider(otherHandle)) {
        hitBumper = true;
      }
    });

    if (pendingBooster && this.ballController.rigidBody) {
      const { direction, impulse } = pendingBooster;
      this.ballController.rigidBody.applyImpulse(
        new this.physicsWorld.rapier.Vector3(
          direction.x * impulse,
          direction.y * impulse,
          direction.z * impulse
        ),
        true
      );
      this.boosterCooldownTimer = 0.35;
      this.audio.playBumper();
    } else if (hitBumper) {
      this.audio.playBumper();
    }

    // Proximity fallback check (within 42.5cm of cup center horizontally and within 50cm vertically)
    if (!ballEnteredHole && goalPos && this.ballController.mesh) {
      const bPos = this.ballController.mesh.position;
      const horizDist = Math.hypot(bPos.x - goalPos.x, bPos.z - goalPos.z);
      const vertDist = Math.abs(bPos.y - goalPos.y);
      if (horizDist < 0.425 && vertDist < 0.50) {
        ballEnteredHole = true;
      }
    }

    if (ballEnteredHole && this.ballController.state !== "in_hole") {
      this.ballController.state = "in_hole";
      this.cameraController.mode = "cup_zoom";
      this.audio.playCupSink();
      this.emit("cupSink", {
        holeNumber: 1,
        totalStrokes: this.ballController.strokes,
        par: 2,
        scoreRelative: this.ballController.strokes - 2,
      });
    }

    // Out of bounds check
    if (this.ballController.state === "out_of_bounds") {
      this.ballController.respawn();
      this.emit("outOfBounds", {
        holeNumber: 1,
        reason: "cliff_fall",
        penaltyApplied: true,
        respawnPosition: [
          this.ballController.mesh.position.x,
          this.ballController.mesh.position.y,
          this.ballController.mesh.position.z,
        ],
      });
    }

    // Camera following ball
    const ballPos = this.ballController.getPosition();
    this.cameraController.setTarget(ballPos);

    const linvel = this.ballController.rigidBody ? this.ballController.rigidBody.linvel() : { x: 0, y: 0, z: 0 };
    const speed = Math.sqrt(linvel.x * linvel.x + linvel.y * linvel.y + linvel.z * linvel.z);
    this.audio.updateRolling(speed);

    if (this.ballController.state === "moving") {
      this.cameraController.mode = "following";
    } else if (this.ballController.state === "aiming") {
      this.cameraController.mode = "aiming";
    }

    this.cameraController.update(deltaTime, speed);

    // Render frame
    this.renderPipeline.render();
  }

  /**
   * Loads a test course hole (Tee -> Straight -> Cup) to validate seamless physics and controls.
   */
  public loadTestHole(): void {
    const testHole: HoleData = {
      holeNumber: 1,
      par: 2,
      teeTileId: "tile_tee",
      cupTileId: "tile_cup",
      tiles: [
        {
          instanceId: "tile_tee",
          kitPieceId: "tee_box_6x6",
          position: [0, 0, 6.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "tile_straight" },
        },
        {
          instanceId: "tile_straight",
          kitPieceId: "straight_6m",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "tile_tee",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "tile_tee", LOC_Socket_Out: "tile_cup" },
        },
        {
          instanceId: "tile_cup",
          kitPieceId: "green_cup_standard_6x6",
          walls: { left: true, right: true },
          attachedTo: {
            parentInstanceId: "tile_straight",
            parentSocketId: "LOC_Socket_Out",
          },
          connectedSockets: { LOC_Socket_In: "tile_straight" },
        },
      ],
      props: [],
    };

    this.courseManager.loadHole(testHole);
    this.ballController.createPhysicsBody(this.courseManager.spawnPosition);
    if (this.courseManager.goalPosition) {
      this.cameraController.playIntroFlyover(
        this.courseManager.spawnPosition,
        this.courseManager.goalPosition
      );
    } else {
      this.cameraController.setTarget(this.courseManager.spawnPosition);
      this.cameraController.snapToTarget();
    }
  }

  private setupResizeListener(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("resize", () => {
        this.renderPipeline.resize();
      });
    }
  }

  public dispose(): void {
    this.stop();
    this.cameraController?.dispose();
    this.slingshotInput?.dispose();
    this.ballController?.dispose();
    this.courseManager?.clear();
    this.physicsWorld.dispose();
    this.renderPipeline.dispose();
    this.eventListeners = {};
  }
}
