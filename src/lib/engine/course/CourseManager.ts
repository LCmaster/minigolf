/**
 * CourseManager.ts
 * Manages placed modular tiles, dynamic wall toggles, and seamless physics welding.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { AssetLoader, ParsedKitPiece } from "../kitbash/AssetLoader";
import type { PlacedTile, PlacedProp, HoleData, SplinePathData } from "../types/CourseSchema";
import { BoosterVisuals } from "./BoosterVisuals";
import { SeamWelder, type TileFloorMeshInfo } from "../physics/SeamWelder";
import { SocketSolver } from "./SocketSolver";
import { planTileSwap, type TileSwapOptions } from "./TileSwapPlanner";
import { GoalCupManager } from "./GoalCupManager";
import {
  PropInstanceManager,
  createStaticTrimeshColliderDesc,
  type BoosterSensorInfo,
  type InstantiatedProp,
} from "./PropInstanceManager";

export type { BoosterSensorInfo, InstantiatedProp };

export interface InstantiatedTile {
  tileData: PlacedTile;
  pieceTemplate: ParsedKitPiece;
  group: THREE.Group;
  wallLMesh?: THREE.Object3D;
  wallRMesh?: THREE.Object3D;
  wallBackMesh?: THREE.Object3D;
  wallLCollider?: RAPIER.Collider;
  wallRCollider?: RAPIER.Collider;
  wallBackCollider?: RAPIER.Collider;
  boosterSensorCollider?: RAPIER.Collider;
  boosterVisuals?: BoosterVisuals;
}

export class CourseManager {
  private scene: THREE.Scene;
  private rapierWorld: RAPIER.World;
  private rapier: typeof RAPIER;
  private assetLoader: AssetLoader;

  private tiles: Map<string, InstantiatedTile> = new Map();
  private propManager: PropInstanceManager;
  private unifiedFloorCollider: RAPIER.Collider | null = null;
  private terrainCollider: RAPIER.Collider | null = null;
  private goalCup: GoalCupManager;
  private boosterSensors: Map<number, BoosterSensorInfo> = new Map();
  private bumperColliderHandles: Set<number> = new Set();
  private splinePath: SplinePathData | null = null;

  public spawnPosition: THREE.Vector3 = new THREE.Vector3(0, 1.1, 0);
  public spawnHeading: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  public showBoundary: boolean = true;
  public onHoleChanged?: () => void;

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
    this.goalCup = new GoalCupManager(scene, rapierWorld, rapier);
    this.propManager = new PropInstanceManager({
      scene,
      rapierWorld,
      rapier,
      assetLoader,
      boosterSensors: this.boosterSensors,
      bumperColliderHandles: this.bumperColliderHandles,
      onChanged: () => this.onHoleChanged?.(),
    });
  }

  public loadHole(hole: HoleData): void {
    this.clear();
    this.showBoundary = hole.showBoundary ?? true;
    this.spawnHeading.set(0, 0, -1);
    this.splinePath = hole.splinePath
      ? {
          closed: false,
          nodes: hole.splinePath.nodes.map((n) => ({
            ...n,
            position: [...n.position] as [number, number, number],
            handleOffset: [...n.handleOffset] as [number, number],
          })),
        }
      : null;

    if (this.splinePath?.nodes && this.splinePath.nodes.length >= 2) {
      const n0 = this.splinePath.nodes[0].position;
      const n1 = this.splinePath.nodes[1].position;
      const dir = new THREE.Vector3(n1[0] - n0[0], 0, n1[2] - n0[2]);
      if (dir.lengthSq() > 0.0001) {
        this.spawnHeading.copy(dir.normalize());
      }
    }

    for (const tileData of hole.tiles) {
      this.addTile(tileData, false);
    }

    if (hole.props) {
      for (const propData of hole.props) {
        this.addProp(propData);
      }
    }

    // Rebuild welded floor collider once all tiles are added
    this.rebuildWeldedFloorPhysics();
    this.onHoleChanged?.();
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
    const isGap = Boolean(tileData.isGap);

    const group = isGap ? new THREE.Group() : template.visualTemplate.clone(true);
    group.position.set(pos[0], pos[1], pos[2]);
    group.rotation.y = (rotY * Math.PI) / 180;
    group.userData = { tileInstanceId: tileData.instanceId };
    this.scene.add(group);

    // Find wall submeshes (supports both single Mesh and multi-material Group wrappers)
    let wallLMesh: THREE.Object3D | undefined;
    let wallRMesh: THREE.Object3D | undefined;
    let wallBackMesh: THREE.Object3D | undefined;

    if (!isGap) {
      group.traverse((child) => {
        const cleanName = child.name.replace(/(?:\.\d+|\d{3})+$/, "");
        if (cleanName === "Mesh_Wall_L" && !wallLMesh) wallLMesh = child;
        if (cleanName === "Mesh_Wall_R" && !wallRMesh) wallRMesh = child;
        if ((cleanName === "Mesh_Wall_Back" || cleanName === "Mesh_Wall_B") && !wallBackMesh) wallBackMesh = child;
      });
    }

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

    if (!isGap) {
      // Check for Tee spawn locator
      if (template.locators.has("LOC_Spawn_Tee")) {
        const loc = template.locators.get("LOC_Spawn_Tee")!.clone();
        loc.applyEuler(group.rotation);
        loc.add(group.position);
        this.spawnPosition.copy(loc);

        const hasSplineNodes = Boolean(this.splinePath?.nodes && this.splinePath.nodes.length >= 2);
        if (!hasSplineNodes) {
          const outSocket = template.sockets.find((s) => s.id === "LOC_Socket_Out");
          if (outSocket) {
            const sockPos = new THREE.Vector3(...outSocket.position).applyMatrix4(group.matrixWorld);
            const heading = new THREE.Vector3(sockPos.x - this.spawnPosition.x, 0, sockPos.z - this.spawnPosition.z);
            if (heading.lengthSq() > 0.0001) {
              this.spawnHeading.copy(heading.normalize());
            } else {
              const fwd = new THREE.Vector3(0, 0, -1).applyEuler(group.rotation);
              this.spawnHeading.set(fwd.x, 0, fwd.z).normalize();
            }
          } else {
            const fwd = new THREE.Vector3(0, 0, -1).applyEuler(group.rotation);
            this.spawnHeading.set(fwd.x, 0, fwd.z).normalize();
          }
        }
      }

      // Check for Goal sensor locator (anchor rim at tile surface, cup cavity & indicator at true bottom)
      if (template.locators.has("LOC_Sensor_Goal")) {
        const loc = template.locators.get("LOC_Sensor_Goal")!.clone();
        loc.applyEuler(group.rotation);
        loc.add(group.position);
        const cupRimPos = new THREE.Vector3(loc.x, group.position.y, loc.z);
        this.goalCup.place(cupRimPos);
      }

      // Check for socket-tile Booster trigger (e.g. hazard_booster_strip_6x3)
      if (template.metadata?.tags?.includes("booster")) {
        const boosterDesc = this.rapier.ColliderDesc.cuboid(2.3, 0.25, 1.4)
          .setTranslation(group.position.x, group.position.y + 0.15, group.position.z)
          .setRotation(group.quaternion)
          .setSensor(true)
          .setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS);
        const boosterCol = this.rapierWorld.createCollider(boosterDesc);
        instantiated.boosterSensorCollider = boosterCol;
        const boosterVisuals = new BoosterVisuals();
        boosterVisuals.update(0);
        group.add(boosterVisuals.group);
        instantiated.boosterVisuals = boosterVisuals;
        const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(group.quaternion).normalize();
        this.boosterSensors.set(boosterCol.handle, {
          direction: forwardDir,
          impulse: 0.038,
          center: group.position.clone(),
          visuals: boosterVisuals,
        });
      }
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
      tile.wallLMesh.visible = !tile.tileData.isGap && active;
    } else if (side === "right" && tile.wallRMesh) {
      tile.wallRMesh.visible = !tile.tileData.isGap && active;
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
    if (!tile.tileData.isGap && tile.tileData.walls.left && tile.pieceTemplate.ubxWallLGeometry) {
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
    if (!tile.tileData.isGap && tile.tileData.walls.right && tile.pieceTemplate.ubxWallRGeometry) {
      const desc = this.createStaticColliderFromGeo(tile.pieceTemplate.ubxWallRGeometry, worldMatrix);
      if (desc) {
        tile.wallRCollider = this.rapierWorld.createCollider(desc);
      }
    }

    // Back Wall (if present on Tee or Cup)
    if (tile.wallBackCollider) {
      if (tile.tileData.isGap) {
        this.rapierWorld.removeCollider(tile.wallBackCollider, false);
        tile.wallBackCollider = undefined;
      }
    } else if (!tile.tileData.isGap && tile.pieceTemplate.ubxWallBackGeometry) {
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
    return createStaticTrimeshColliderDesc(this.rapier, geo, matrix);
  }

  public rebuildWeldedFloorPhysics(): void {
    if (this.unifiedFloorCollider) {
      this.rapierWorld.removeCollider(this.unifiedFloorCollider, false);
      this.unifiedFloorCollider = null;
    }

    const floorTiles: TileFloorMeshInfo[] = [];

    for (const tile of this.tiles.values()) {
      if (!tile.tileData.isGap && tile.pieceTemplate.ubxFloorGeometry) {
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
    this.onHoleChanged?.();
  }

  /** Cup rim position (turf level) of the current hole, or `null` when it has no cup. */
  public get goalPosition(): THREE.Vector3 | null {
    return this.goalCup.goalPosition;
  }

  /** Cup floor position of the current hole. */
  public get cupBottomPosition(): THREE.Vector3 | null {
    return this.goalCup.cupBottomPosition;
  }

  public getCupBottomCollider(): RAPIER.Collider | null {
    return this.goalCup.cupBottomCollider;
  }

  public getCupBottomPosition(): THREE.Vector3 | null {
    return this.goalCup.cupBottomPosition;
  }

  public updateTerrainCollider(
    geometry: THREE.BufferGeometry,
    worldMatrix: THREE.Matrix4 = new THREE.Matrix4()
  ): void {
    if (this.terrainCollider) {
      this.rapierWorld.removeCollider(this.terrainCollider, false);
      this.terrainCollider = null;
    }
    const desc = this.createStaticColliderFromGeo(geometry, worldMatrix);
    if (desc) {
      desc.setFriction(0.75);
      desc.setRestitution(0.2);
      this.terrainCollider = this.rapierWorld.createCollider(desc);
    }
  }

  public getTerrainCollider(): RAPIER.Collider | null {
    return this.terrainCollider;
  }

  public getGoalSensorCollider(): RAPIER.Collider | null {
    return this.goalCup.goalSensorCollider;
  }

  /** Advances hover/pulse/flash animation of every booster's chevron visuals. */
  public updateBoosterVisuals(time: number, deltaTime: number): void {
    for (const info of this.boosterSensors.values()) {
      info.visuals?.update(time, deltaTime);
    }
  }

  public getBoosterSensor(colliderHandle: number): BoosterSensorInfo | undefined {
    return this.boosterSensors.get(colliderHandle);
  }

  public isBumperCollider(colliderHandle: number): boolean {
    return this.bumperColliderHandles.has(colliderHandle);
  }

  public getGoalPosition(): THREE.Vector3 | null {
    return this.goalCup.goalPosition;
  }

  public getAllTiles(): InstantiatedTile[] {
    return Array.from(this.tiles.values());
  }

  public getTile(instanceId: string): InstantiatedTile | undefined {
    return this.tiles.get(instanceId);
  }

  /** Connects `socketId` on `tileInstanceId` to `targetTileId`. */
  public connectTileSocket(tileInstanceId: string, socketId: string, targetTileId: string): boolean {
    const tile = this.tiles.get(tileInstanceId);
    if (!tile) return false;
    tile.tileData.connectedSockets = tile.tileData.connectedSockets || {};
    tile.tileData.connectedSockets[socketId] = targetTileId;
    return true;
  }

  /** Disconnects `socketId` on `tileInstanceId` if currently connected. */
  public disconnectTileSocket(tileInstanceId: string, socketId: string): boolean {
    const tile = this.tiles.get(tileInstanceId);
    if (!tile?.tileData.connectedSockets || !(socketId in tile.tileData.connectedSockets)) {
      return false;
    }
    delete tile.tileData.connectedSockets[socketId];
    return true;
  }

  /** Returns all other tiles holding an outgoing socket link pointing at `tileInstanceId`. */
  public findIncomingSocketLinks(tileInstanceId: string): Array<{ tileId: string; socketId: string }> {
    const links: Array<{ tileId: string; socketId: string }> = [];
    for (const [otherId, otherTile] of this.tiles.entries()) {
      const conns = otherTile.tileData.connectedSockets;
      if (!conns) continue;
      for (const [sockId, targetId] of Object.entries(conns)) {
        if (targetId === tileInstanceId) {
          links.push({ tileId: otherId, socketId: sockId });
        }
      }
    }
    return links;
  }

  public removeTile(instanceId: string): boolean {
    const tile = this.tiles.get(instanceId);
    if (!tile) return false;

    this.scene.remove(tile.group);
    if (tile.wallLCollider) this.rapierWorld.removeCollider(tile.wallLCollider, false);
    if (tile.wallRCollider) this.rapierWorld.removeCollider(tile.wallRCollider, false);
    if (tile.wallBackCollider) this.rapierWorld.removeCollider(tile.wallBackCollider, false);
    tile.boosterVisuals?.dispose();
    if (tile.boosterSensorCollider) {
      this.boosterSensors.delete(tile.boosterSensorCollider.handle);
      this.rapierWorld.removeCollider(tile.boosterSensorCollider, false);
    }
    this.tiles.delete(instanceId);

    // Clear references to removed tile in remaining connectedSockets
    for (const remaining of this.tiles.values()) {
      const conns = remaining.tileData.connectedSockets;
      if (!conns) continue;
      for (const [sockId, targetId] of Object.entries(conns)) {
        if (targetId === instanceId) {
          delete conns[sockId];
        }
      }
    }

    this.rebuildWeldedFloorPhysics();
    return true;
  }

  /**
   * Toggles a track tile between solid surface and an open-air jump gap (`isGap`),
   * keeping all upstream/downstream socket links and world transforms completely intact.
   */
  public setTileGap(instanceId: string, isGap: boolean): boolean {
    const existing = this.tiles.get(instanceId);
    if (!existing) return false;

    const idLower = existing.tileData.kitPieceId.toLowerCase();
    if (idLower.includes("tee") || idLower.includes("cup")) {
      return false;
    }
    if (Boolean(existing.tileData.isGap) === isGap) {
      return true;
    }

    const saved = this.exportHoleData();
    const target = saved.tiles.find((t) => t.instanceId === instanceId);
    if (!target) return false;
    target.isGap = isGap;

    this.loadHole(saved);
    return true;
  }

  /**
   * Swaps an instantiated tile to a new kit piece type (and optional reversed socket direction
   * for symmetrical left/right turns) and automatically re-chains all downstream attached tiles.
   */
  public swapTileType(
    instanceId: string,
    newKitPieceId: string,
    options?: TileSwapOptions
  ): boolean {
    if (!this.tiles.has(instanceId)) return false;

    const newTemplate = this.assetLoader.getPiece(newKitPieceId);
    if (!newTemplate) return false;

    const plan = planTileSwap(
      this.exportHoleData(),
      instanceId,
      newKitPieceId,
      newTemplate.sockets,
      options
    );
    if (!plan) return false;

    this.loadHole(plan);
    return true;
  }

  public updatePropTransform(
    instanceId: string,
    position: [number, number, number],
    rotation: [number, number, number]
  ): boolean {
    return this.propManager.updatePropTransform(instanceId, position, rotation);
  }

  public addProp(propData: PlacedProp): InstantiatedProp | null {
    return this.propManager.addProp(propData);
  }

  public removeProp(instanceId: string): boolean {
    return this.propManager.removeProp(instanceId);
  }

  public getAllProps(): InstantiatedProp[] {
    return this.propManager.getAllProps();
  }

  public getProp(instanceId: string): InstantiatedProp | undefined {
    return this.propManager.getProp(instanceId);
  }

  public setShowBoundary(show: boolean): void {
    this.showBoundary = show;
    this.onHoleChanged?.();
  }

  public setSplinePath(path: SplinePathData | null): void {
    this.splinePath = path
      ? {
          closed: false,
          nodes: path.nodes.map((n) => ({
            ...n,
            position: [...n.position] as [number, number, number],
            handleOffset: [...n.handleOffset] as [number, number],
          })),
        }
      : null;
  }

  public getSplinePath(): SplinePathData | null {
    return this.splinePath
      ? {
          closed: false,
          nodes: this.splinePath.nodes.map((n) => ({
            ...n,
            position: [...n.position] as [number, number, number],
            handleOffset: [...n.handleOffset] as [number, number],
          })),
        }
      : null;
  }

  public exportHoleData(par: number = 3, holeNumber: number = 1): HoleData {
    const tiles: PlacedTile[] = Array.from(this.tiles.values()).map((t) => ({
      ...t.tileData,
      position: t.tileData.position ? ([...t.tileData.position] as [number, number, number]) : undefined,
      walls: { ...t.tileData.walls },
      connectedSockets: t.tileData.connectedSockets ? { ...t.tileData.connectedSockets } : undefined,
      attachedTo: t.tileData.attachedTo ? { ...t.tileData.attachedTo } : undefined,
    }));
    const props: PlacedProp[] = this.propManager.exportProps();

    const teeTile = tiles.find((t) => t.kitPieceId.includes("tee")) || tiles[0];
    const cupTile = tiles.find((t) => t.kitPieceId.includes("cup")) || tiles[tiles.length - 1];

    return {
      holeNumber,
      par,
      teeTileId: teeTile?.instanceId || "",
      cupTileId: cupTile?.instanceId || "",
      tiles,
      props,
      showBoundary: this.showBoundary,
      splinePath: this.getSplinePath() ?? undefined,
    };
  }

  public clear(): void {
    for (const tile of this.tiles.values()) {
      this.scene.remove(tile.group);
      tile.boosterVisuals?.dispose();
      if (tile.wallLCollider) this.rapierWorld.removeCollider(tile.wallLCollider, false);
      if (tile.wallRCollider) this.rapierWorld.removeCollider(tile.wallRCollider, false);
      if (tile.wallBackCollider) this.rapierWorld.removeCollider(tile.wallBackCollider, false);
      if (tile.boosterSensorCollider) this.rapierWorld.removeCollider(tile.boosterSensorCollider, false);
    }
    this.tiles.clear();

    this.propManager.clear();
    this.boosterSensors.clear();
    this.bumperColliderHandles.clear();
    this.splinePath = null;

    if (this.unifiedFloorCollider) {
      this.rapierWorld.removeCollider(this.unifiedFloorCollider, false);
      this.unifiedFloorCollider = null;
    }
    if (this.terrainCollider) {
      this.rapierWorld.removeCollider(this.terrainCollider, false);
      this.terrainCollider = null;
    }
    this.goalCup.clear();
  }
}

