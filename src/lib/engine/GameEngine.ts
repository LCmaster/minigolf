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
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private fpsCounter: number = 0;
  private fpsTimer: number = 0;

  private eventListeners: { [K in keyof EngineEventMap]?: Function[] } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.renderPipeline = new RenderPipeline(canvas);
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
      this.ballController
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

    this.setupResizeListener();
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
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000.0;
    this.lastTime = currentTime;

    // FPS calculation
    this.fpsCounter++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1.0) {
      this.emit("fpsUpdate", this.fpsCounter);
      this.fpsCounter = 0;
      this.fpsTimer = 0;
    }

    // Step physics simulation
    this.physicsWorld.step(deltaTime);

    // Update ball physics & visual transform
    this.ballController.update();

    // Check goal sensor collision
    const goalCollider = this.courseManager.getGoalSensorCollider();
    if (goalCollider && this.ballController.collider) {
      this.physicsWorld.drainCollisionEvents((h1, h2, intersecting) => {
        const goalHandle = goalCollider.handle;
        const ballHandle = this.ballController.collider.handle;

        if (intersecting && ((h1 === goalHandle && h2 === ballHandle) || (h2 === goalHandle && h1 === ballHandle))) {
          if (this.ballController.state !== "in_hole") {
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
        }
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

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

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
          kitPieceId: "tee_box_4x4",
          position: [0, 0, 4.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_Out: "tile_straight" },
        },
        {
          instanceId: "tile_straight",
          kitPieceId: "straight_4m",
          position: [0, 0, 0.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "tile_tee", LOC_Socket_Out: "tile_cup" },
        },
        {
          instanceId: "tile_cup",
          kitPieceId: "green_cup_standard_4x4",
          position: [0, 0, -4.0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: { LOC_Socket_In: "tile_straight" },
        },
      ],
      props: [],
    };

    this.courseManager.loadHole(testHole);
    this.ballController.createPhysicsBody(this.courseManager.spawnPosition);
    this.cameraController.setTarget(this.courseManager.spawnPosition);
  }

  private setupResizeListener(): void {
    window.addEventListener("resize", () => {
      this.renderPipeline.resize();
    });
  }

  public dispose(): void {
    this.stop();
    this.slingshotInput?.dispose();
    this.ballController?.dispose();
    this.courseManager?.clear();
    this.physicsWorld.dispose();
    this.renderPipeline.dispose();
    this.eventListeners = {};
  }
}
