/**
 * GameEngine.ts
 * Master high-performance decoupled engine orchestrator for Mini Golf Mania.
 * Zero Svelte overhead in the 60/120fps render and physics loop.
 */

import * as THREE from "three";
import { RenderPipeline } from "./scene/RenderPipeline";
import { PhysicsWorld } from "./physics/PhysicsWorld";
import type { EngineEventMap } from "./types/EngineEvents";

export class GameEngine {
  public renderPipeline!: RenderPipeline;
  public physicsWorld!: PhysicsWorld;

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private fpsCounter: number = 0;
  private fpsTimer: number = 0;

  private eventListeners: { [K in keyof EngineEventMap]?: Function[] } = {};

  // Debug objects for Milestone 1 validation
  private debugEntities: Array<{ mesh: THREE.Mesh; rigidBody?: any }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.renderPipeline = new RenderPipeline(canvas);
    this.physicsWorld = new PhysicsWorld();
  }

  public async init(): Promise<void> {
    await this.physicsWorld.init();
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

    // Sync debug entities (if any)
    for (const entity of this.debugEntities) {
      if (entity.rigidBody) {
        const translation = entity.rigidBody.translation();
        const rotation = entity.rigidBody.rotation();
        entity.mesh.position.set(translation.x, translation.y, translation.z);
        entity.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
      }
    }

    // Render frame
    this.renderPipeline.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Spawns a test ground and bouncing dynamic sphere to validate physics harness.
   */
  public spawnHarnessTestObjects(): void {
    const rapier = this.physicsWorld.rapier;
    const world = this.physicsWorld.world;
    if (!world) return;

    // 1. Static Ground Box (16m x 0.5m x 16m)
    const groundGeo = new THREE.BoxGeometry(16, 0.5, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: "#2E7D32", // Lush golf green
      roughness: 0.7,
      metalness: 0.1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.set(0, -0.25, 0);
    groundMesh.receiveShadow = true;
    this.renderPipeline.scene.add(groundMesh);

    // Ground Rapier Collider
    const groundBodyDesc = rapier.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0);
    const groundBody = world.createRigidBody(groundBodyDesc);
    const groundColliderDesc = rapier.ColliderDesc.cuboid(8, 0.25, 8).setFriction(0.4).setRestitution(0.5);
    world.createCollider(groundColliderDesc, groundBody);

    this.debugEntities.push({ mesh: groundMesh, rigidBody: groundBody });

    // 2. Dynamic Golf Ball Sphere (r = 0.2m)
    const ballGeo = new THREE.SphereGeometry(0.2, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({
      color: "#FFFFFF",
      roughness: 0.2,
      metalness: 0.0,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.position.set(0, 6, 0);
    ballMesh.castShadow = true;
    this.renderPipeline.scene.add(ballMesh);

    // Ball Rapier Dynamic Rigid Body
    const ballBodyDesc = rapier.RigidBodyDesc.dynamic()
      .setTranslation(0, 6, 0)
      .setCcdEnabled(true);
    const ballBody = world.createRigidBody(ballBodyDesc);
    const ballColliderDesc = rapier.ColliderDesc.ball(0.2)
      .setFriction(0.3)
      .setRestitution(0.75); // Bouncy for validation
    world.createCollider(ballColliderDesc, ballBody);

    this.debugEntities.push({ mesh: ballMesh, rigidBody: ballBody });
  }

  private setupResizeListener(): void {
    window.addEventListener("resize", () => {
      this.renderPipeline.resize();
    });
  }

  public dispose(): void {
    this.stop();
    this.physicsWorld.dispose();
    this.renderPipeline.dispose();
    this.eventListeners = {};
  }
}
