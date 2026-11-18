import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { createTileBooster, BOOSTER_IMPULSE } from "./TileBooster";

beforeAll(async () => {
  await RAPIER.init();
});

describe("createTileBooster", () => {
  it("builds a sensor volume, chevron visuals and push info for a tile group", () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const group = new THREE.Group();
    group.position.set(2, 1, -4);
    group.rotation.y = Math.PI / 2;
    group.updateMatrixWorld(true);

    const booster = createTileBooster(RAPIER, world, group);

    expect(booster.collider.isSensor()).toBe(true);
    expect(world.colliders.len()).toBe(1);
    expect(group.children).toContain(booster.visuals.group);

    expect(booster.info.impulse).toBe(BOOSTER_IMPULSE);
    expect(booster.info.visuals).toBe(booster.visuals);
    expect(booster.info.center.toArray()).toEqual([2, 1, -4]);
    // +90deg around Y rotates local -Z forward to -X
    expect(booster.info.direction.x).toBeCloseTo(-1, 4);
    expect(booster.info.direction.z).toBeCloseTo(0, 4);
  });
});
