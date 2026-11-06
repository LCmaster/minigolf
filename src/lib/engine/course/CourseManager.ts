/**
 * CourseManager.ts
 * Manages placed modular tiles, dynamic wall toggles, and seamless physics welding.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { AssetLoader, ParsedKitPiece } from "../kitbash/AssetLoader";
import type { PlacedTile, HoleData } from "../types/CourseSchema";
import { SeamWelder, type TileFloorMeshInfo } from "../physics/SeamWelder";

export interface InstantiatedTile {
  tileData: PlacedTile;
  pieceTemplate: ParsedKitPiece;
  group: THREE.Group;
  wallLMesh?: THREE.Mesh;
  wallRMesh?: THREE.Mesh;
  wallBackMesh?: THREE.Mesh;
  wallLCollider?: RAPIER.Collider;
  wallRCollider?: RAPIER.Collider;
  wallBackCollider?: RAPIER.Collider;
}

export class CourseManager {
  private scene: THREE.Scene;
  private rapierWorld: RAPIER.World;
  private rapier: typeof RAPIER;
  private assetLoader: AssetLoader;

  private tiles: Map<string, InstantiatedTile> = new Map();
  private unifiedFloorCollider: RAPIER.Collider | null = null;
  private goalSensorCollider: RAPIER.Collider | null = null;

  public goalPosition: THREE.Vector3 | null = null;
  public spawnPosition: THREE.Vector3 = new THREE.Vector3(0, 0.2, 0);

  constructor(
    scene: THREE.Scene,
    rapierWorld: RAPIER.World,
    rapier: typeof RAPIER,
    assetLoader: AssetLoader
  ) {
    this.scene = scene;
    this.rapierWorld = rapierWorld;
    this.rapier = rapier;
    this.assetLoader = assetLoader;
  }

  public loadHole(hole: HoleData): void {
    this.clear();

    for (const tileData of hole.tiles) {
      this.addTile(tileData, false);
    }

    // Rebuild welded floor collider once all tiles are added
    this.rebuildWeldedFloorPhysics();
  }

  public addTile(tileData: PlacedTile, rebuildFloor: boolean = true): InstantiatedTile | null {
    const template = this.assetLoader.getPiece(tileData.kitPieceId);
    if (!template) {
      console.warn(`Kit piece template not found: ${tileData.kitPieceId}`);
      return null;
    }

    const group = template.visualTemplate.clone(true);
    group.position.set(...tileData.position);
    group.rotation.y = (tileData.rotationY * Math.PI) / 180;
    this.scene.add(group);

    // Find wall submeshes
    let wallLMesh: THREE.Mesh | undefined;
    let wallRMesh: THREE.Mesh | undefined;
    let wallBackMesh: THREE.Mesh | undefined;

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.name === "Mesh_Wall_L") wallLMesh = child;
        if (child.name === "Mesh_Wall_R") wallRMesh = child;
        if (child.name === "Mesh_Wall_Back") wallBackMesh = child;
      }
    });

    const instantiated: InstantiatedTile = {
      tileData,
      pieceTemplate: template,
      group,
      wallLMesh,
      wallRMesh,
      wallBackMesh,
    };

    // Apply initial wall visibility
    if (wallLMesh) wallLMesh.visible = tileData.walls.left;
    if (wallRMesh) wallRMesh.visible = tileData.walls.right;

    // Create wall colliders in Rapier
    this.updateTileWallPhysics(instantiated);

    // Check for Tee spawn locator
    if (template.locators.has("LOC_Spawn_Tee")) {
      const loc = template.locators.get("LOC_Spawn_Tee")!.clone();
      loc.applyEuler(group.rotation);
      loc.add(group.position);
      this.spawnPosition.copy(loc);
    }

    // Check for Goal sensor locator
    if (template.locators.has("LOC_Sensor_Goal")) {
      const loc = template.locators.get("LOC_Sensor_Goal")!.clone();
      loc.applyEuler(group.rotation);
      loc.add(group.position);
      this.goalPosition = loc;
      this.createGoalSensor(loc);
    }

    this.tiles.set(tileData.instanceId, instantiated);

    if (rebuildFloor) {
      this.rebuildWeldedFloorPhysics();
    }

    return instantiated;
  }

  public toggleWall(instanceId: string, side: "left" | "right"): boolean {
    const tile = this.tiles.get(instanceId);
    if (!tile) return false;

    tile.tileData.walls[side] = !tile.tileData.walls[side];
    const active = tile.tileData.walls[side];

    if (side === "left" && tile.wallLMesh) {
      tile.wallLMesh.visible = active;
    } else if (side === "right" && tile.wallRMesh) {
      tile.wallRMesh.visible = active;
    }

    this.updateTileWallPhysics(tile);
    return active;
  }

  private updateTileWallPhysics(tile: InstantiatedTile): void {
    const worldMatrix = tile.group.matrixWorld;
    tile.group.updateMatrixWorld(true);

    // Left Wall
    if (tile.wallLCollider) {
      this.rapierWorld.removeCollider(tile.wallLCollider, false);
      tile.wallLCollider = undefined;
    }
    if (tile.tileData.walls.left && tile.pieceTemplate.ubxWallLGeometry) {
      const desc = this.createStaticColliderFromGeo(tile.pieceTemplate.ubxWallLGeometry, worldMatrix);
      if (desc) {
        tile.wallLCollider = this.rapierWorld.createCollider(desc);
      }
    }

    // Right Wall
    if (tile.wallRCollider) {
      this.rapierWorld.removeCollider(tile.wallRCollider, false);
      tile.wallRCollider = undefined;
    }
    if (tile.tileData.walls.right && tile.pieceTemplate.ubxWallRGeometry) {
      const desc = this.createStaticColliderFromGeo(tile.pieceTemplate.ubxWallRGeometry, worldMatrix);
      if (desc) {
        tile.wallRCollider = this.rapierWorld.createCollider(desc);
      }
    }

    // Back Wall (if present on Tee or Cup)
    if (!tile.wallBackCollider && tile.pieceTemplate.ubxWallBackGeometry) {
      const desc = this.createStaticColliderFromGeo(tile.pieceTemplate.ubxWallBackGeometry, worldMatrix);
      if (desc) {
        tile.wallBackCollider = this.rapierWorld.createCollider(desc);
      }
    }
  }

  private createStaticColliderFromGeo(
    geo: THREE.BufferGeometry,
    matrix: THREE.Matrix4
  ): RAPIER.ColliderDesc | null {
    const pos = geo.attributes.position;
    if (!pos) return null;

    const verts = new Float32Array(pos.count * 3);
    const tempVec = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      tempVec.fromBufferAttribute(pos, i);
      tempVec.applyMatrix4(matrix);
      verts[i * 3] = tempVec.x;
      verts[i * 3 + 1] = tempVec.y;
      verts[i * 3 + 2] = tempVec.z;
    }

    const indices = geo.index
      ? new Uint32Array(geo.index.array)
      : new Uint32Array(Array.from({ length: pos.count }, (_, i) => i));

    const collider = this.rapier.ColliderDesc.trimesh(verts, indices);
    collider.setFriction(0.4);
    collider.setRestitution(0.6); // Wood rail bounce
    return collider;
  }

  public rebuildWeldedFloorPhysics(): void {
    if (this.unifiedFloorCollider) {
      this.rapierWorld.removeCollider(this.unifiedFloorCollider, false);
      this.unifiedFloorCollider = null;
    }

    const floorTiles: TileFloorMeshInfo[] = [];

    for (const tile of this.tiles.values()) {
      if (tile.pieceTemplate.ubxFloorGeometry) {
        tile.group.updateMatrixWorld(true);
        floorTiles.push({
          geometry: tile.pieceTemplate.ubxFloorGeometry,
          worldMatrix: tile.group.matrixWorld.clone(),
        });
      }
    }

    const floorColliderDesc = SeamWelder.weldFloorsToRapierTrimesh(floorTiles, this.rapier);
    if (floorColliderDesc) {
      this.unifiedFloorCollider = this.rapierWorld.createCollider(floorColliderDesc);
    }
  }

  private createGoalSensor(pos: THREE.Vector3): void {
    if (this.goalSensorCollider) {
      this.rapierWorld.removeCollider(this.goalSensorCollider, false);
      this.goalSensorCollider = null;
    }

    const desc = this.rapier.ColliderDesc.ball(0.125)
      .setTranslation(pos.x, pos.y, pos.z)
      .setSensor(true);

    this.goalSensorCollider = this.rapierWorld.createCollider(desc);
  }

  public getGoalSensorCollider(): RAPIER.Collider | null {
    return this.goalSensorCollider;
  }

  public clear(): void {
    for (const tile of this.tiles.values()) {
      this.scene.remove(tile.group);
      if (tile.wallLCollider) this.rapierWorld.removeCollider(tile.wallLCollider, false);
      if (tile.wallRCollider) this.rapierWorld.removeCollider(tile.wallRCollider, false);
      if (tile.wallBackCollider) this.rapierWorld.removeCollider(tile.wallBackCollider, false);
    }
    this.tiles.clear();

    if (this.unifiedFloorCollider) {
      this.rapierWorld.removeCollider(this.unifiedFloorCollider, false);
      this.unifiedFloorCollider = null;
    }
    if (this.goalSensorCollider) {
      this.rapierWorld.removeCollider(this.goalSensorCollider, false);
      this.goalSensorCollider = null;
    }
  }
}

