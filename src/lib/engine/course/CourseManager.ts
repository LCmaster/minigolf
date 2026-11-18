/**
 * CourseManager.ts
 * Manages placed modular tiles, dynamic wall toggles, and seamless physics welding.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { AssetLoader, ParsedKitPiece } from "../kitbash/AssetLoader";
import type { PlacedTile, PlacedProp, HoleData, SplinePathData } from "../types/CourseSchema";
import { planTileSwap, type TileSwapOptions } from "./TileSwapPlanner";
import { GoalCupManager } from "./GoalCupManager";
import { TilePhysics } from "./TilePhysics";
import { createTileBooster } from "./TileBooster";
import { snapTileToParent, computeTeeHeading } from "./TilePlacement";
import { cloneSplinePath } from "../spline/PolylineMath";
import {
  connectSocket,
  disconnectSocket,
  findIncomingLinks,
  removeLinksTo,
  type SocketLink,
} from "./TileSocketGraph";
import type { InstantiatedTile } from "./InstantiatedTile";
import {
  PropInstanceManager,
  type BoosterSensorInfo,
  type InstantiatedProp,
} from "./PropInstanceManager";

export type { BoosterSensorInfo, InstantiatedProp, InstantiatedTile };

export class CourseManager {
  private scene: THREE.Scene;
  private rapierWorld: RAPIER.World;
  private rapier: typeof RAPIER;
  private assetLoader: AssetLoader;

  private tiles: Map<string, InstantiatedTile> = new Map();
  private propManager: PropInstanceManager;
  private tilePhysics: TilePhysics;
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
    this.tilePhysics = new TilePhysics(rapierWorld, rapier);
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
    this.splinePath = hole.splinePath ? cloneSplinePath(hole.splinePath) : null;

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
    const parent = tileData.attachedTo
      ? this.tiles.get(tileData.attachedTo.parentInstanceId)
      : undefined;
    snapTileToParent(
      tileData,
      parent && { group: parent.group, sockets: parent.pieceTemplate.sockets },
      template.sockets
    );

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
    this.tilePhysics.syncWallColliders(instantiated);

    if (!isGap) {
      // Check for Tee spawn locator
      if (template.locators.has("LOC_Spawn_Tee")) {
        const loc = template.locators.get("LOC_Spawn_Tee")!.clone();
        loc.applyEuler(group.rotation);
        loc.add(group.position);
        this.spawnPosition.copy(loc);

        if (!this.hasSplineHeading()) {
          this.spawnHeading.copy(computeTeeHeading(group, template.sockets, this.spawnPosition));
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
        const booster = createTileBooster(this.rapier, this.rapierWorld, group);
        instantiated.boosterSensorCollider = booster.collider;
        instantiated.boosterVisuals = booster.visuals;
        this.boosterSensors.set(booster.collider.handle, booster.info);
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

    this.tilePhysics.syncWallColliders(tile);
    return active;
  }

  public rebuildWeldedFloorPhysics(): void {
    this.tilePhysics.rebuildWeldedFloor(this.tiles.values());
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
    this.tilePhysics.setTerrain(geometry, worldMatrix);
  }

  public getTerrainCollider(): RAPIER.Collider | null {
    return this.tilePhysics.terrainCollider;
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
    return connectSocket(this.tiles, tileInstanceId, socketId, targetTileId);
  }

  /** Disconnects `socketId` on `tileInstanceId` if currently connected. */
  public disconnectTileSocket(tileInstanceId: string, socketId: string): boolean {
    return disconnectSocket(this.tiles, tileInstanceId, socketId);
  }

  /** Returns all other tiles holding an outgoing socket link pointing at `tileInstanceId`. */
  public findIncomingSocketLinks(tileInstanceId: string): SocketLink[] {
    return findIncomingLinks(this.tiles, tileInstanceId);
  }

  public removeTile(instanceId: string): boolean {
    const tile = this.tiles.get(instanceId);
    if (!tile) return false;

    this.scene.remove(tile.group);
    tile.boosterVisuals?.dispose();
    if (tile.boosterSensorCollider) {
      this.boosterSensors.delete(tile.boosterSensorCollider.handle);
    }
    this.tilePhysics.removeTileColliders(tile);
    this.tiles.delete(instanceId);

    removeLinksTo(this.tiles, instanceId);

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
    this.splinePath = path ? cloneSplinePath(path) : null;
  }

  public getSplinePath(): SplinePathData | null {
    return this.splinePath ? cloneSplinePath(this.splinePath) : null;
  }

  /** True when the loaded hole has a spline whose first leg defines the spawn heading. */
  private hasSplineHeading(): boolean {
    return (this.splinePath?.nodes.length ?? 0) >= 2;
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
      this.tilePhysics.removeTileColliders(tile);
    }
    this.tiles.clear();

    this.propManager.clear();
    this.boosterSensors.clear();
    this.bumperColliderHandles.clear();
    this.splinePath = null;

    this.tilePhysics.clear();
    this.goalCup.clear();
  }
}
