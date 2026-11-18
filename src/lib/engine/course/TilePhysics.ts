/**
 * TilePhysics.ts
 * Rapier collider lifecycle for placed tiles: per-tile wall rails, the welded seamless
 * floor shared by all solid tiles, and the optional terrain overlay collider.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { SeamWelder, type TileFloorMeshInfo } from "../physics/SeamWelder";
import { createStaticTrimeshColliderDesc, createWaterHazardCollider } from "./PropInstanceManager";
import type { InstantiatedTile } from "./InstantiatedTile";

export class TilePhysics {
  private readonly rapierWorld: RAPIER.World;
  private readonly rapier: typeof RAPIER;
  private readonly waterHazardColliderHandles: Set<number>;
  private weldedFloor: RAPIER.Collider | null = null;
  private terrain: RAPIER.Collider | null = null;

  constructor(
    rapierWorld: RAPIER.World,
    rapier: typeof RAPIER,
    waterHazardColliderHandles: Set<number> = new Set()
  ) {
    this.rapierWorld = rapierWorld;
    this.rapier = rapier;
    this.waterHazardColliderHandles = waterHazardColliderHandles;
  }

  public get terrainCollider(): RAPIER.Collider | null {
    return this.terrain;
  }

  /** Rebuilds left/right/back rail colliders to match the tile's wall flags and gap state. */
  public syncWallColliders(tile: InstantiatedTile): void {
    tile.group.updateMatrixWorld(true);
    const worldMatrix = tile.group.matrixWorld.clone();
    const { tileData, pieceTemplate } = tile;
    const solid = !tileData.isGap;

    tile.wallLCollider = this.replaceCollider(
      tile.wallLCollider,
      solid && tileData.walls.left ? pieceTemplate.ubxWallLGeometry : undefined,
      worldMatrix
    );
    tile.wallRCollider = this.replaceCollider(
      tile.wallRCollider,
      solid && tileData.walls.right ? pieceTemplate.ubxWallRGeometry : undefined,
      worldMatrix
    );

    // Back wall (Tee / Cup) is created once and only removed when the tile becomes a gap
    if (tile.wallBackCollider) {
      if (tileData.isGap) {
        this.rapierWorld.removeCollider(tile.wallBackCollider, false);
        tile.wallBackCollider = undefined;
      }
    } else if (solid) {
      tile.wallBackCollider = this.replaceCollider(
        undefined,
        pieceTemplate.ubxWallBackGeometry,
        worldMatrix
      );
    }

    this.clearWaterColliders(tile);
    if (solid && pieceTemplate.ubxWaterGeometries?.length) {
      for (const waterGeo of pieceTemplate.ubxWaterGeometries) {
        const col = createWaterHazardCollider(
          this.rapier,
          this.rapierWorld,
          waterGeo,
          worldMatrix,
          this.waterHazardColliderHandles
        );
        if (col) tile.waterColliders!.push(col);
      }
    }
  }

  /** Removes a tile's wall, water-hazard, and booster-sensor colliders from the physics world. */
  public removeTileColliders(tile: InstantiatedTile): void {
    for (const collider of [
      tile.wallLCollider,
      tile.wallRCollider,
      tile.wallBackCollider,
      tile.boosterSensorCollider,
    ]) {
      if (collider) this.rapierWorld.removeCollider(collider, false);
    }
    this.clearWaterColliders(tile);
  }

  private clearWaterColliders(tile: InstantiatedTile): void {
    if (tile.waterColliders) {
      for (const col of tile.waterColliders) {
        this.waterHazardColliderHandles.delete(col.handle);
        this.rapierWorld.removeCollider(col, false);
      }
    }
    tile.waterColliders = [];
  }

  /** Welds the floors of all solid tiles into one seamless trimesh collider. */
  public rebuildWeldedFloor(tiles: Iterable<InstantiatedTile>): void {
    if (this.weldedFloor) {
      this.rapierWorld.removeCollider(this.weldedFloor, false);
      this.weldedFloor = null;
    }

    const floorTiles: TileFloorMeshInfo[] = [];
    for (const tile of tiles) {
      if (!tile.tileData.isGap && tile.pieceTemplate.ubxFloorGeometry) {
        tile.group.updateMatrixWorld(true);
        floorTiles.push({
          geometry: tile.pieceTemplate.ubxFloorGeometry,
          worldMatrix: tile.group.matrixWorld.clone(),
        });
      }
    }

    const desc = SeamWelder.weldFloorsToRapierTrimesh(floorTiles, this.rapier);
    if (desc) this.weldedFloor = this.rapierWorld.createCollider(desc);
  }

  /** Replaces the terrain overlay collider (grippy, low-bounce) from world-space geometry. */
  public setTerrain(
    geometry: THREE.BufferGeometry,
    worldMatrix: THREE.Matrix4 = new THREE.Matrix4()
  ): void {
    if (this.terrain) {
      this.rapierWorld.removeCollider(this.terrain, false);
      this.terrain = null;
    }
    const desc = createStaticTrimeshColliderDesc(this.rapier, geometry, worldMatrix);
    if (desc) {
      desc.setFriction(0.75);
      desc.setRestitution(0.2);
      this.terrain = this.rapierWorld.createCollider(desc);
    }
  }

  /** Removes the welded floor and terrain colliders (per-tile colliders are removed per tile). */
  public clear(): void {
    if (this.weldedFloor) {
      this.rapierWorld.removeCollider(this.weldedFloor, false);
      this.weldedFloor = null;
    }
    if (this.terrain) {
      this.rapierWorld.removeCollider(this.terrain, false);
      this.terrain = null;
    }
  }

  /** Removes `existing` and, when `geometry` is given, creates a fresh trimesh collider for it. */
  private replaceCollider(
    existing: RAPIER.Collider | undefined,
    geometry: THREE.BufferGeometry | undefined,
    worldMatrix: THREE.Matrix4
  ): RAPIER.Collider | undefined {
    if (existing) this.rapierWorld.removeCollider(existing, false);
    if (!geometry) return undefined;
    const desc = createStaticTrimeshColliderDesc(this.rapier, geometry, worldMatrix);
    return desc ? this.rapierWorld.createCollider(desc) : undefined;
  }
}
