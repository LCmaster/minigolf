import { describe, it, expect } from "vitest";
import { PhysicsWorld } from "./PhysicsWorld";

describe("PhysicsWorld Unit Tests", () => {
  it("initializes Rapier world and eventQueue with standard gravity", async () => {
    const pw = new PhysicsWorld();
    expect(pw.ready).toBe(false);

    // Step before init should safely no-op
    expect(() => pw.step(0.016)).not.toThrow();
    expect(() => pw.drainCollisionEvents()).not.toThrow();

    await pw.init();
    expect(pw.ready).toBe(true);
    expect(pw.world).toBeDefined();
    expect(pw.eventQueue).toBeDefined();
    expect(pw.world.gravity.y).toBeCloseTo(-9.81, 2);

    pw.dispose();
    expect(pw.ready).toBe(false);
  });

  it("accumulates deltaTime and steps world at fixed 120Hz intervals with lag spike clamping", async () => {
    const pw = new PhysicsWorld();
    await pw.init();

    // Create a falling dynamic body with a mass-bearing collider
    const bodyDesc = pw.rapier.RigidBodyDesc.dynamic().setTranslation(0, 10, 0);
    const body = pw.world.createRigidBody(bodyDesc);
    pw.world.createCollider(pw.rapier.ColliderDesc.ball(0.1), body);

    // Small sub-frame step (< 1/120s) should accumulate without stepping yet
    pw.step(0.005);
    expect(body.translation().y).toBeCloseTo(10, 4);

    // Advance past 1/120s (total 0.020s -> 2 physics substeps)
    pw.step(0.015);
    const yAfterOneStep = body.translation().y;
    expect(yAfterOneStep).toBeLessThan(10);

    // Huge lag spike (5.0 seconds) should be clamped to max 0.1s (at most 6 steps)
    pw.step(5.0);
    const yAfterSpike = body.translation().y;
    expect(yAfterSpike).toBeGreaterThan(9.0); // In 0.1s, freefall is only 0.5*9.81*0.01 = ~0.05m

    pw.dispose();
  });

  it("drains active collision events between sensor and dynamic ball", async () => {
    const pw = new PhysicsWorld();
    await pw.init();

    // Static sensor at origin
    const sensorDesc = pw.rapier.ColliderDesc.ball(1.0)
      .setTranslation(0, 0, 0)
      .setSensor(true)
      .setActiveEvents(pw.rapier.ActiveEvents.COLLISION_EVENTS);
    const sensor = pw.world.createCollider(sensorDesc);

    // Dynamic ball overlapping sensor
    const body = pw.world.createRigidBody(
      pw.rapier.RigidBodyDesc.dynamic().setTranslation(0, 0.2, 0)
    );
    const ballCol = pw.world.createCollider(
      pw.rapier.ColliderDesc.ball(0.1).setActiveEvents(pw.rapier.ActiveEvents.COLLISION_EVENTS),
      body
    );

    // Step simulation
    pw.step(1 / 60);

    const events: Array<{ h1: number; h2: number; started: boolean }> = [];
    pw.drainCollisionEvents((h1, h2, started) => {
      events.push({ h1, h2, started });
    });

    expect(events.length).toBeGreaterThan(0);
    const match = events.some(
      (e) =>
        e.started &&
        ((e.h1 === sensor.handle && e.h2 === ballCol.handle) ||
          (e.h2 === sensor.handle && e.h1 === ballCol.handle))
    );
    expect(match).toBe(true);

    pw.dispose();
  });

  it("exposes 120Hz fixed delta, fires onBeforeStep per substep, and computes interpolation alpha", async () => {
    const pw = new PhysicsWorld();
    await pw.init();

    expect(pw.getFixedDelta()).toBeCloseTo(1 / 120, 6);
    expect(pw.getInterpolationAlpha()).toBe(0);

    let stepCalls = 0;
    pw.onBeforeStep = () => {
      stepCalls++;
    };

    // 1.5 substeps at 120Hz -> 1 step + ~0.5 interpolation alpha
    pw.step(1.5 / 120);
    expect(stepCalls).toBe(1);
    expect(pw.getInterpolationAlpha()).toBeCloseTo(0.5, 4);

    // Another 1.0 substep -> reaches 2.5 substeps -> 1 more step + ~0.5 alpha
    pw.step(1 / 120);
    expect(stepCalls).toBe(2);
    expect(pw.getInterpolationAlpha()).toBeCloseTo(0.5, 4);

    pw.dispose();
  });
});
