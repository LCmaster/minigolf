/**
 * CourseManager.ts
 * Manages placed modular tiles, dynamic wall toggles, and seamless physics welding.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { AssetLoader, ParsedKitPiece } from "../kitbash/AssetLoader";
import type { PlacedTile, PlacedProp, HoleData, SplinePathData } from "../types/CourseSchema";
import { SeamWelder, type TileFloorMeshInfo } from "../physics/SeamWelder";
import { SocketSolver } from "./SocketSolver";

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
}

export interface BoosterSensorInfo {
  direction: THREE.Vector3;
  impulse: number;
  center: THREE.Vector3;
}

export interface InstantiatedProp {
  propData: PlacedProp;
  pieceTemplate: ParsedKitPiece;
  group: THREE.Group;
  colliders: RAPIER.Collider[];
}

export class CourseManager {
  private scene: THREE.Scene;
  private rapierWorld: RAPIER.World;
  private rapier: typeof RAPIER;
  private assetLoader: AssetLoader;

  private tiles: Map<string, InstantiatedTile> = new Map();
  private props: Map<string, InstantiatedProp> = new Map();
  private unifiedFloorCollider: RAPIER.Collider | null = null;
  private terrainCollider: RAPIER.Collider | null = null;
  private goalSensorCollider: RAPIER.Collider | null = null;
  private cupBottomCollider: RAPIER.Collider | null = null;
  private boosterSensors: Map<number, BoosterSensorInfo> = new Map();
  private bumperColliderHandles: Set<number> = new Set();
  private flagSprite: THREE.Sprite | null = null;
  private visualCupGroup: THREE.Group | null = null;
  private splinePath: SplinePathData | null = null;

  public goalPosition: THREE.Vector3 | null = null;
  public cupBottomPosition: THREE.Vector3 | null = null;
  public spawnPosition: THREE.Vector3 = new THREE.Vector3(0, 1.1, 0);
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
  }

  public loadHole(hole: HoleData): void {
    this.clear();
    this.showBoundary = hole.showBoundary ?? true;
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

    const group = template.visualTemplate.clone(true);
    group.position.set(pos[0], pos[1], pos[2]);
    group.rotation.y = (rotY * Math.PI) / 180;
    group.userData = { tileInstanceId: tileData.instanceId };
    this.scene.add(group);

    // Find wall submeshes (supports both single Mesh and multi-material Group wrappers)
    let wallLMesh: THREE.Object3D | undefined;
    let wallRMesh: THREE.Object3D | undefined;
    let wallBackMesh: THREE.Object3D | undefined;

    group.traverse((child) => {
      const cleanName = child.name.replace(/(?:\.\d+|\d{3})+$/, "");
      if (cleanName === "Mesh_Wall_L" && !wallLMesh) wallLMesh = child;
      if (cleanName === "Mesh_Wall_R" && !wallRMesh) wallRMesh = child;
      if ((cleanName === "Mesh_Wall_Back" || cleanName === "Mesh_Wall_B") && !wallBackMesh) wallBackMesh = child;
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

    // Check for Goal sensor locator (anchor rim at tile surface, cup cavity & indicator at true bottom)
    if (template.locators.has("LOC_Sensor_Goal")) {
      const loc = template.locators.get("LOC_Sensor_Goal")!.clone();
      loc.applyEuler(group.rotation);
      loc.add(group.position);
      const cupRimPos = new THREE.Vector3(loc.x, group.position.y, loc.z);
      this.createGoalSensor(cupRimPos);
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
      const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(group.quaternion).normalize();
      this.boosterSensors.set(boosterCol.handle, {
        direction: forwardDir,
        impulse: 0.038,
        center: group.position.clone(),
      });
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
    this.onHoleChanged?.();
  }

  private createGoalSensor(cupRimPos: THREE.Vector3): void {
    if (this.goalSensorCollider) {
      this.rapierWorld.removeCollider(this.goalSensorCollider, false);
      this.goalSensorCollider = null;
    }
    if (this.cupBottomCollider) {
      this.rapierWorld.removeCollider(this.cupBottomCollider, false);
      this.cupBottomCollider = null;
    }
    if (this.flagSprite) {
      this.scene.remove(this.flagSprite);
      this.flagSprite = null;
    }
    if (this.visualCupGroup) {
      this.scene.remove(this.visualCupGroup);
      this.visualCupGroup = null;
    }

    const CUP_DEPTH = 0.30;
    const cupFloorY = cupRimPos.y - CUP_DEPTH;
    this.goalPosition = cupRimPos.clone();
    this.cupBottomPosition = new THREE.Vector3(cupRimPos.x, cupFloorY, cupRimPos.z);

    // High-visibility real 3D circular cup liner and bottom indicator
    const cupGroup = new THREE.Group();
    cupGroup.name = "Visual_Cup_Cavity";
    cupGroup.position.set(cupRimPos.x, cupRimPos.y, cupRimPos.z);

    // 1. Dark matte cup interior cavity
    const interiorGeo = new THREE.CylinderGeometry(0.38, 0.38, CUP_DEPTH, 32, 1, false);
    const interiorMat = new THREE.MeshStandardMaterial({
      color: 0x121214,
      roughness: 0.85,
      metalness: 0.05,
    });
    const interiorMesh = new THREE.Mesh(interiorGeo, interiorMat);
    interiorMesh.position.y = -CUP_DEPTH * 0.5;
    interiorMesh.receiveShadow = true;
    cupGroup.add(interiorMesh);

    // 2. High-contrast target indicator ring seated cleanly at the bottom of the hole
    const bottomDiscGeo = new THREE.CircleGeometry(0.36, 32);
    bottomDiscGeo.rotateX(-Math.PI / 2);
    const bottomDiscMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
    const bottomDisc = new THREE.Mesh(bottomDiscGeo, bottomDiscMat);
    bottomDisc.position.y = -CUP_DEPTH + 0.008;
    cupGroup.add(bottomDisc);

    const targetRingGeo = new THREE.RingGeometry(0.18, 0.30, 32);
    targetRingGeo.rotateX(-Math.PI / 2);
    const targetRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
    });
    const targetRing = new THREE.Mesh(targetRingGeo, targetRingMat);
    targetRing.position.y = -CUP_DEPTH + 0.012;
    cupGroup.add(targetRing);

    // 3. Crisp ceramic white cup rim collar at turf edge
    const rimGeo = new THREE.RingGeometry(0.36, 0.425, 32);
    rimGeo.rotateX(-Math.PI / 2);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.y = 0.005;
    rimMesh.receiveShadow = true;
    cupGroup.add(rimMesh);

    this.visualCupGroup = cupGroup;
    this.scene.add(this.visualCupGroup);

    // Solid cup floor collider to physically catch and support balls at the bottom of the cup
    const bottomDesc = this.rapier.ColliderDesc.cylinder(0.05, 0.44)
      .setTranslation(cupRimPos.x, cupFloorY - 0.05, cupRimPos.z)
      .setFriction(1.5)
      .setRestitution(0.05);
    this.cupBottomCollider = this.rapierWorld.createCollider(bottomDesc);

    // Goal sensor seated directly on the bottom floor of the cup cavity
    const desc = this.rapier.ColliderDesc.cylinder(0.025, 0.425)
      .setTranslation(cupRimPos.x, cupFloorY + 0.025, cupRimPos.z)
      .setSensor(true)
      .setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS);
    this.goalSensorCollider = this.rapierWorld.createCollider(desc);

    // Tournament flag billboard planted with pole base at the true bottom of the cup
    this.flagSprite = this.createFlagBillboard(this.cupBottomPosition);
    this.scene.add(this.flagSprite);
  }

  private createFlagBillboard(cupFloorPos: THREE.Vector3): THREE.Sprite {
    if (typeof document === "undefined") {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
      sprite.center.set(0.5, 0);
      sprite.scale.set(1.5, 1.5, 1.0);
      sprite.position.set(cupFloorPos.x, cupFloorPos.y, cupFloorPos.z);
      return sprite;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, 128, 128);

      // Slender gold flagpole extending flush to the bottom edge (cup bottom)
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(61, 16, 6, 112);
      ctx.beginPath();
      ctx.arc(64, 16, 5, 0, Math.PI * 2);
      ctx.fill();

      // Vibrant pennant flag
      ctx.beginPath();
      ctx.moveTo(67, 20);
      ctx.lineTo(122, 36);
      ctx.lineTo(67, 52);
      ctx.closePath();
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      // Pin icon
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⛳", 88, 36);
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
    sprite.center.set(0.5, 0);
    sprite.scale.set(1.6, 1.6, 1.0);
    sprite.position.set(cupFloorPos.x, cupFloorPos.y, cupFloorPos.z);
    return sprite;
  }

  public getCupBottomCollider(): RAPIER.Collider | null {
    return this.cupBottomCollider;
  }

  public getCupBottomPosition(): THREE.Vector3 | null {
    return this.cupBottomPosition;
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
    return this.goalSensorCollider;
  }

  public getBoosterSensor(colliderHandle: number): BoosterSensorInfo | undefined {
    return this.boosterSensors.get(colliderHandle);
  }

  public isBumperCollider(colliderHandle: number): boolean {
    return this.bumperColliderHandles.has(colliderHandle);
  }

  public getGoalPosition(): THREE.Vector3 | null {
    return this.goalPosition;
  }

  public getAllTiles(): InstantiatedTile[] {
    return Array.from(this.tiles.values());
  }

  public getTile(instanceId: string): InstantiatedTile | undefined {
    return this.tiles.get(instanceId);
  }

  public removeTile(instanceId: string): boolean {
    const tile = this.tiles.get(instanceId);
    if (!tile) return false;

    this.scene.remove(tile.group);
    if (tile.wallLCollider) this.rapierWorld.removeCollider(tile.wallLCollider, false);
    if (tile.wallRCollider) this.rapierWorld.removeCollider(tile.wallRCollider, false);
    if (tile.wallBackCollider) this.rapierWorld.removeCollider(tile.wallBackCollider, false);
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

  public updatePropTransform(
    instanceId: string,
    position: [number, number, number],
    rotation: [number, number, number]
  ): boolean {
    const existing = this.props.get(instanceId);
    if (!existing) return false;

    const updated: PlacedProp = {
      ...existing.propData,
      position: [...position] as [number, number, number],
      rotation: [...rotation] as [number, number, number],
      scale: [...existing.propData.scale] as [number, number, number],
    };

    this.removeProp(instanceId);
    this.addProp(updated);
    return true;
  }

  public addProp(propData: PlacedProp): InstantiatedProp | null {
    const template = this.assetLoader.getPiece(propData.propId);
    if (!template) {
      console.warn(`Prop template not found: ${propData.propId}`);
      return null;
    }

    const group = template.visualTemplate.clone(true);
    group.position.set(...propData.position);
    group.rotation.set(
      (propData.rotation[0] * Math.PI) / 180,
      (propData.rotation[1] * Math.PI) / 180,
      (propData.rotation[2] * Math.PI) / 180
    );
    group.scale.set(...propData.scale);
    group.userData = { propInstanceId: propData.instanceId };
    this.scene.add(group);
    group.updateMatrixWorld(true);

    const colliders: RAPIER.Collider[] = [];
    const isBumper = Boolean(template.metadata?.tags?.includes("bumper"));
    const isBooster = Boolean(template.metadata?.tags?.includes("booster"));
    const colliderGeos: THREE.BufferGeometry[] = [
      ...(template.ubxColliderGeometries || []),
      ...(template.ubxFloorGeometry ? [template.ubxFloorGeometry] : []),
    ];

    for (const geo of colliderGeos) {
      const desc = this.createStaticColliderFromGeo(geo, group.matrixWorld);
      if (desc) {
        if (isBumper) {
          desc.setRestitution(1.15);
          desc.setFriction(0.15);
        }
        const col = this.rapierWorld.createCollider(desc);
        if (isBumper) {
          this.bumperColliderHandles.add(col.handle);
        }
        colliders.push(col);
      }
    }

    if (template.ubxSensorGeometry) {
      const sensorDesc = this.createStaticColliderFromGeo(template.ubxSensorGeometry, group.matrixWorld);
      if (sensorDesc) {
        sensorDesc.setSensor(true).setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS);
        const sensorCol = this.rapierWorld.createCollider(sensorDesc);
        colliders.push(sensorCol);
        if (isBooster) {
          const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(group.quaternion).normalize();
          this.boosterSensors.set(sensorCol.handle, {
            direction: forwardDir,
            impulse: 0.038,
            center: group.position.clone(),
          });
        }
      }
    }

    const instantiated: InstantiatedProp = {
      propData,
      pieceTemplate: template,
      group,
      colliders,
    };
    this.props.set(propData.instanceId, instantiated);
    this.onHoleChanged?.();
    return instantiated;
  }

  public removeProp(instanceId: string): boolean {
    const prop = this.props.get(instanceId);
    if (!prop) return false;

    this.scene.remove(prop.group);
    for (const col of prop.colliders) {
      this.boosterSensors.delete(col.handle);
      this.bumperColliderHandles.delete(col.handle);
      this.rapierWorld.removeCollider(col, false);
    }
    this.props.delete(instanceId);
    this.onHoleChanged?.();
    return true;
  }

  public getAllProps(): InstantiatedProp[] {
    return Array.from(this.props.values());
  }

  public getProp(instanceId: string): InstantiatedProp | undefined {
    return this.props.get(instanceId);
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
    const props: PlacedProp[] = Array.from(this.props.values()).map((p) => ({
      ...p.propData,
      position: [...p.propData.position] as [number, number, number],
      rotation: [...p.propData.rotation] as [number, number, number],
      scale: [...p.propData.scale] as [number, number, number],
    }));

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
      if (tile.wallLCollider) this.rapierWorld.removeCollider(tile.wallLCollider, false);
      if (tile.wallRCollider) this.rapierWorld.removeCollider(tile.wallRCollider, false);
      if (tile.wallBackCollider) this.rapierWorld.removeCollider(tile.wallBackCollider, false);
      if (tile.boosterSensorCollider) this.rapierWorld.removeCollider(tile.boosterSensorCollider, false);
    }
    this.tiles.clear();

    for (const prop of this.props.values()) {
      this.scene.remove(prop.group);
      for (const col of prop.colliders) {
        this.rapierWorld.removeCollider(col, false);
      }
    }
    this.props.clear();
    this.boosterSensors.clear();
    this.bumperColliderHandles.clear();
    this.splinePath = null;

    if (this.unifiedFloorCollider) {
      this.rapierWorld.removeCollider(this.unifiedFloorCollider, false);
      this.unifiedFloorCollider = null;
    }
    if (this.goalSensorCollider) {
      this.rapierWorld.removeCollider(this.goalSensorCollider, false);
      this.goalSensorCollider = null;
    }
    if (this.cupBottomCollider) {
      this.rapierWorld.removeCollider(this.cupBottomCollider, false);
      this.cupBottomCollider = null;
    }
    if (this.terrainCollider) {
      this.rapierWorld.removeCollider(this.terrainCollider, false);
      this.terrainCollider = null;
    }
    if (this.flagSprite) {
      this.scene.remove(this.flagSprite);
      this.flagSprite = null;
    }
    if (this.visualCupGroup) {
      this.scene.remove(this.visualCupGroup);
      this.visualCupGroup = null;
    }
  }
}

