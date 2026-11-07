/**
 * CourseManager.ts
 * Manages placed modular tiles, dynamic wall toggles, and seamless physics welding.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { AssetLoader, ParsedKitPiece } from "../kitbash/AssetLoader";
import type { PlacedTile, HoleData } from "../types/CourseSchema";
import { SeamWelder, type TileFloorMeshInfo } from "../physics/SeamWelder";
import { SocketSolver } from "./SocketSolver";

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
  private flagSprite: THREE.Sprite | null = null;

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

    // Resolve mathematical socket snapping if attachedTo is provided
    if (tileData.attachedTo) {
      const parent = this.tiles.get(tileData.attachedTo.parentInstanceId);
      if (parent) {
        parent.group.updateMatrixWorld(true);
        const parentSocket = parent.pieceTemplate.sockets.find(
          (s) => s.id === tileData.attachedTo!.parentSocketId
        );
        const childSocketId = tileData.attachedTo.childSocketId || "LOC_Socket_In";
        const childSocket = template.sockets.find((s) => s.id === childSocketId);

        if (parentSocket && childSocket) {
          const snappedMatrix = SocketSolver.computeSnappedTransform(
            parent.group.matrixWorld,
            parentSocket,
            childSocket
          );
          const pos = new THREE.Vector3();
          const quat = new THREE.Quaternion();
          const scale = new THREE.Vector3();
          snappedMatrix.decompose(pos, quat, scale);
          const euler = new THREE.Euler().setFromQuaternion(quat, "YXZ");

          tileData.position = [pos.x, pos.y, pos.z];
          tileData.rotationY = (euler.y * 180) / Math.PI;
        }
      }
    }

    const pos = tileData.position || [0, 0, 0];
    const rotY = tileData.rotationY || 0;

    const group = template.visualTemplate.clone(true);
    group.position.set(pos[0], pos[1], pos[2]);
    group.rotation.y = (rotY * Math.PI) / 180;
    this.scene.add(group);

    // Find wall submeshes
    let wallLMesh: THREE.Mesh | undefined;
    let wallRMesh: THREE.Mesh | undefined;
    let wallBackMesh: THREE.Mesh | undefined;

    group.traverse((child) => {
      const cleanName = child.name.replace(/\.\d+$/, "");
      if (child instanceof THREE.Mesh) {
        if (cleanName === "Mesh_Wall_L") wallLMesh = child;
        if (cleanName === "Mesh_Wall_R") wallRMesh = child;
        if (cleanName === "Mesh_Wall_Back") wallBackMesh = child;
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

    // Ensure transform matrix is computed before instantiating physics colliders
    group.updateMatrixWorld(true);

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

  public snapTileToSocket(
    parentInstanceId: string,
    parentSocketId: string,
    childKitPieceId: string,
    childInstanceId: string,
    childSocketInId: string = "LOC_Socket_In",
    walls: { left: boolean; right: boolean } = { left: true, right: true },
    rebuildFloor: boolean = true
  ): InstantiatedTile | null {
    const tileData: PlacedTile = {
      instanceId: childInstanceId,
      kitPieceId: childKitPieceId,
      walls,
      attachedTo: {
        parentInstanceId,
        parentSocketId,
        childSocketId: childSocketInId,
      },
    };
    return this.addTile(tileData, rebuildFloor);
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
    tile.group.updateMatrixWorld(true);
    const worldMatrix = tile.group.matrixWorld.clone();

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
    if (this.flagSprite) {
      this.scene.remove(this.flagSprite);
      this.flagSprite = null;
    }

    // Arcade enlarged cup sensor: 0.28m radius (0.56m diameter), settled -0.10m deep in floor slab
    const desc = this.rapier.ColliderDesc.ball(0.28)
      .setTranslation(pos.x, pos.y - 0.1, pos.z)
      .setSensor(true)
      .setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS);

    this.goalSensorCollider = this.rapierWorld.createCollider(desc);

    // Floating camera-facing tournament flag billboard marker (no rigid pole to interfere with ball physics)
    this.flagSprite = this.createFlagBillboard(pos);
    this.scene.add(this.flagSprite);
  }

  private createFlagBillboard(pos: THREE.Vector3): THREE.Sprite {
    if (typeof document === "undefined") {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
      sprite.position.set(pos.x, pos.y + 1.2, pos.z);
      return sprite;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);

      // Slender gold flagpole
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(36, 16, 6, 96);
      ctx.beginPath();
      ctx.arc(39, 16, 5, 0, Math.PI * 2);
      ctx.fill();

      // Vibrant pennant flag
      ctx.beginPath();
      ctx.moveTo(42, 20);
      ctx.lineTo(108, 38);
      ctx.lineTo(42, 56);
      ctx.closePath();
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Pin icon
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⛳", 66, 38);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.5, 1.5, 1.0);
    sprite.position.set(pos.x, pos.y + 1.2, pos.z);
    return sprite;
  }

  public getGoalSensorCollider(): RAPIER.Collider | null {
    return this.goalSensorCollider;
  }

  public getGoalPosition(): THREE.Vector3 | null {
    return this.goalPosition;
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
    if (this.flagSprite) {
      this.scene.remove(this.flagSprite);
      this.flagSprite = null;
    }
  }
}

