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
  private fixedDelta: number = 1 / 60;
  private accumulator: number = 0;

  public async init(): Promise<void> {
    await RAPIER.init();

    const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
    this.world = new RAPIER.World(gravity);
    this.eventQueue = new RAPIER.EventQueue(true);
    this.isReady = true;
  }

  public get ready(): boolean {
    return this.isReady;
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
      this.world.step(this.eventQueue);
      this.accumulator -= this.fixedDelta;
    }
  }

  public drainCollisionEvents(
    onIntersection?: (handle1: number, handle2: number, intersecting: boolean) => void,
    onContact?: (handle1: number, handle2: number) => void
  ): void {
    if (!this.eventQueue) return;

    this.eventQueue.drainIntersectionEvents((h1, h2, intersecting) => {
      onIntersection?.(h1, h2, intersecting);
    });

    this.eventQueue.drainContactEvents((h1, h2) => {
      onContact?.(h1, h2);
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

