/**
 * PhysicsWorld.ts
 * Manages the Rapier 3D physics simulation instance, time-stepping, and collision queues.
 */

import RAPIER from "@dimforge/rapier3d-compat";

export class PhysicsWorld {
  public world!: RAPIER.World;
  public rapier: typeof RAPIER = RAPIER;
  public eventQueue!: RAPIER.EventQueue;

  private isReady: boolean = false;
  private fixedDelta: number = 1 / 120;
  private accumulator: number = 0;

  public onBeforeStep?: () => void;

  public async init(): Promise<void> {
    await RAPIER.init();

    const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
    this.world = new RAPIER.World(gravity);
    this.world.timestep = this.fixedDelta;
    this.eventQueue = new RAPIER.EventQueue(false);
    this.isReady = true;
  }

  public get ready(): boolean {
    return this.isReady;
  }

  public getFixedDelta(): number {
    return this.fixedDelta;
  }

  public getInterpolationAlpha(): number {
    return Math.max(0, Math.min(1, this.accumulator / this.fixedDelta));
  }

  /**
   * Advance simulation with fixed time-step accumulator.
   */
  public step(deltaTime: number): void {
    if (!this.isReady || !this.world) return;

    // Cap frame delta to prevent spiral of death on lag spikes
    const clampedDelta = Math.min(deltaTime, 0.1);
    this.accumulator += clampedDelta;

    while (this.accumulator >= this.fixedDelta) {
      this.onBeforeStep?.();
      this.world.step(this.eventQueue);
      this.accumulator -= this.fixedDelta;
    }
  }

  public drainCollisionEvents(
    onCollision?: (handle1: number, handle2: number, started: boolean) => void
  ): void {
    if (!this.eventQueue) return;

    this.eventQueue.drainCollisionEvents((h1, h2, started) => {
      onCollision?.(h1, h2, started);
    });
  }

  public dispose(): void {
    if (this.world) {
      this.world.free();
    }
    if (this.eventQueue) {
      this.eventQueue.free();
    }
    this.isReady = false;
  }
}

