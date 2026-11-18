import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { TilePhysics } from "./TilePhysics";
import type { InstantiatedTile } from "./InstantiatedTile";

beforeAll(async () => {
  await RAPIER.init();
});

function setup() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const physics = new TilePhysics(world, RAPIER);
  return { world, physics };
}

function makeTile(overrides: Partial<InstantiatedTile["tileData"]> = {}): InstantiatedTile {
  const group = new THREE.Group();
  return {
    tileData: {
      instanceId: "t1",
      kitPieceId: "carnival_straight_6m",
      walls: { left: true, right: true },
      ...overrides,
    },
    pieceTemplate: {
      ubxWallLGeometry: new THREE.BoxGeometry(0.4, 0.6, 6),
      ubxWallRGeometry: new THREE.BoxGeometry(0.4, 0.6, 6),
      ubxWallBackGeometry: new THREE.BoxGeometry(5, 0.6, 0.4),
      ubxFloorGeometry: new THREE.BoxGeometry(5, 0.5, 6),
    } as any,
    group,
  };
}

describe("TilePhysics", () => {
  it("creates left, right and back wall colliders for a solid tile", () => {
    const { world, physics } = setup();
    const tile = makeTile();
    physics.syncWallColliders(tile);

    expect(tile.wallLCollider).toBeDefined();
    expect(tile.wallRCollider).toBeDefined();
    expect(tile.wallBackCollider).toBeDefined();
    expect(world.colliders.len()).toBe(3);
  });

  it("removes a wall collider when its side is disabled and keeps the others", () => {
    const { world, physics } = setup();
    const tile = makeTile();
    physics.syncWallColliders(tile);

    tile.tileData.walls.left = false;
    physics.syncWallColliders(tile);

    expect(tile.wallLCollider).toBeUndefined();
    expect(tile.wallRCollider).toBeDefined();
    expect(world.colliders.len()).toBe(2);
  });

  it("drops every wall collider for gap tiles", () => {
    const { world, physics } = setup();
    const tile = makeTile();
    physics.syncWallColliders(tile);

    tile.tileData.isGap = true;
    physics.syncWallColliders(tile);

    expect(tile.wallLCollider).toBeUndefined();
    expect(tile.wallRCollider).toBeUndefined();
    expect(tile.wallBackCollider).toBeUndefined();
    expect(world.colliders.len()).toBe(0);
  });

  it("removes wall and booster sensor colliders of a tile", () => {
    const { world, physics } = setup();
    const tile = makeTile();
    physics.syncWallColliders(tile);
    tile.boosterSensorCollider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(1, 1, 1).setSensor(true)
    );
    expect(world.colliders.len()).toBe(4);

    physics.removeTileColliders(tile);
    expect(world.colliders.len()).toBe(0);
  });

  it("welds the floors of solid tiles into one collider and skips gap tiles", () => {
    const { world, physics } = setup();
    const solid = makeTile();
    const gap = makeTile({ instanceId: "gap", isGap: true });

    physics.rebuildWeldedFloor([solid, gap]);
    expect(world.colliders.len()).toBe(1);

    // Rebuilding replaces the previous welded collider
    physics.rebuildWeldedFloor([solid]);
    expect(world.colliders.len()).toBe(1);

    physics.rebuildWeldedFloor([gap]);
    expect(world.colliders.len()).toBe(0);
  });

  it("replaces the terrain collider with grippy low-bounce physics", () => {
    const { world, physics } = setup();
    physics.setTerrain(new THREE.BoxGeometry(10, 1, 10));
    const first = physics.terrainCollider!;
    expect(first.friction()).toBeCloseTo(0.75, 2);
    expect(first.restitution()).toBeCloseTo(0.2, 2);

    physics.setTerrain(new THREE.BoxGeometry(4, 1, 4));
    expect(world.colliders.len()).toBe(1);
    expect(physics.terrainCollider).not.toBe(first);
  });

  it("clear removes welded floor and terrain colliders", () => {
    const { world, physics } = setup();
    physics.rebuildWeldedFloor([makeTile()]);
    physics.setTerrain(new THREE.BoxGeometry(2, 1, 2));
    physics.clear();

    expect(world.colliders.len()).toBe(0);
    expect(physics.terrainCollider).toBeNull();
  });

  it("creates, skips on gap, and cleans up water hazard colliders from ubxWaterGeometries", () => {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const waterHandles = new Set<number>();
    const physics = new TilePhysics(world, RAPIER, waterHandles);
    const tile = makeTile();
    tile.pieceTemplate.ubxWaterGeometries = [new THREE.PlaneGeometry(5, 3)];

    physics.syncWallColliders(tile);
    expect(tile.waterColliders).toHaveLength(1);
    const handle = tile.waterColliders![0].handle;
    expect(tile.waterColliders![0].isSensor()).toBe(true);
    expect(waterHandles.has(handle)).toBe(true);

    tile.tileData.isGap = true;
    physics.syncWallColliders(tile);
    expect(tile.waterColliders).toHaveLength(0);
    expect(waterHandles.has(handle)).toBe(false);

    tile.tileData.isGap = false;
    physics.syncWallColliders(tile);
    expect(waterHandles.size).toBe(1);

    physics.removeTileColliders(tile);
    expect(waterHandles.size).toBe(0);
    expect(world.colliders.len()).toBe(0);
  });
});
