/**
 * EditorController.ts
 * Manages 3D raycasting, open socket visual gizmos, piece snapping math, and wall toggles.
 */

import * as THREE from "three";
import type { CourseManager } from "../course/CourseManager";
import { SocketSolver } from "../course/SocketSolver";
import type { AssetLoader } from "../kitbash/AssetLoader";
import type { PlacedTile, PlacedProp } from "../types/CourseSchema";
import { HistoryManager, type EditorCommand } from "./HistoryManager";

export interface OpenSocketInfo {
  tileInstanceId: string;
  socketId: string;
  worldPosition: THREE.Vector3;
  normal: THREE.Vector3;
  elevation: number;
}

export class EditorController {
  private canvas: HTMLCanvasElement;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private courseManager: CourseManager;
  private assetLoader: AssetLoader;

  public history: HistoryManager;
  public openSockets: OpenSocketInfo[] = [];

  // Visual gizmos
  private socketGizmoGroup: THREE.Group;
  private raycaster: THREE.Raycaster;
  private hoveredSocket: OpenSocketInfo | null = null;
  private hoveredWall: { tileInstanceId: string; side: "left" | "right"; mesh: THREE.Mesh } | null = null;
  private selectedPropId: string | null = null;
  private propRotationY: number = 0;
  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  public onSocketClick?: (info: OpenSocketInfo, screenX: number, screenY: number) => void;
  public onCourseModified?: () => void;
  public onPropPlaced?: (prop: PlacedProp) => void;

  constructor(
    canvas: HTMLCanvasElement,
    camera: THREE.Camera,
    scene: THREE.Scene,
    courseManager: CourseManager,
    assetLoader: AssetLoader
  ) {
    this.canvas = canvas;
    this.camera = camera;
    this.scene = scene;
    this.courseManager = courseManager;
    this.assetLoader = assetLoader;

    this.history = new HistoryManager();
    this.raycaster = new THREE.Raycaster();

    this.socketGizmoGroup = new THREE.Group();
    this.socketGizmoGroup.name = "Editor_SocketGizmos";
    this.scene.add(this.socketGizmoGroup);

    this.attachEventListeners();
  }

  private handleKeyDown = (ev: KeyboardEvent): void => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "z") {
      ev.preventDefault();
      if (ev.shiftKey) {
        this.history.redo();
      } else {
        this.history.undo();
      }
      this.refreshOpenSockets();
      this.onCourseModified?.();
    } else if ((ev.ctrlKey || ev.metaKey) && ev.key === "y") {
      ev.preventDefault();
      this.history.redo();
      this.refreshOpenSockets();
      this.onCourseModified?.();
    } else if (ev.key === "r" || ev.key === "R") {
      this.propRotationY = (this.propRotationY + 45) % 360;
    } else if (ev.key === "Escape") {
      this.selectedPropId = null;
    }
  };

  private attachEventListeners(): void {
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("contextmenu", this.handleContextMenu);

    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.handleKeyDown);
    }
  }

  public setSelectedProp(propId: string | null): void {
    this.selectedPropId = propId;
  }

  public getPropRotationY(): number {
    return this.propRotationY;
  }

  public refreshOpenSockets(): void {
    this.openSockets = [];
    while (this.socketGizmoGroup.children.length > 0) {
      this.socketGizmoGroup.remove(this.socketGizmoGroup.children[0]);
    }

    // Inspect all placed tiles
    // @ts-ignore (accessing tiles map)
    const tilesMap = this.courseManager["tiles"] as Map<string, any>;
    if (!tilesMap) return;

    for (const [instanceId, instantiated] of tilesMap.entries()) {
      const tileData: PlacedTile = instantiated.tileData;
      const template = instantiated.pieceTemplate;
      const group = instantiated.group;

      for (const socket of template.sockets) {
        // Check if this socket is already connected to another tile
        if (tileData.connectedSockets && tileData.connectedSockets[socket.id]) {
          continue;
        }

        // Calculate world position & normal
        const localPos = new THREE.Vector3(...socket.position);
        localPos.applyEuler(group.rotation);
        const worldPos = new THREE.Vector3().addVectors(group.position, localPos);

        const localNorm = new THREE.Vector3(...socket.normal);
        localNorm.applyEuler(group.rotation).normalize();

        const info: OpenSocketInfo = {
          tileInstanceId: instanceId,
          socketId: socket.id,
          worldPosition: worldPos,
          normal: localNorm,
          elevation: worldPos.y,
        };

        this.openSockets.push(info);
        this.createSocketGizmo(info);
      }
    }
  }

  private createSocketGizmo(info: OpenSocketInfo): void {
    // Glowing pulsing ring indicator
    const ringGeo = new THREE.TorusGeometry(0.8, 0.08, 16, 32);
    ringGeo.rotateX(Math.PI / 2); // Lay flat

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.85,
    });

    const gizmo = new THREE.Mesh(ringGeo, ringMat);
    gizmo.position.copy(info.worldPosition);
    gizmo.position.y += 0.05; // Slightly above floor
    gizmo.userData = { socketInfo: info };

    this.socketGizmoGroup.add(gizmo);
  }

  private handlePointerMove = (ev: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // Raycast against socket gizmos
    const socketIntersects = this.raycaster.intersectObjects(this.socketGizmoGroup.children);
    if (socketIntersects.length > 0) {
      const hit = socketIntersects[0].object as THREE.Mesh;
      this.hoveredSocket = hit.userData.socketInfo;
      (hit.material as THREE.MeshBasicMaterial).color.setHex(0xffaa00); // Amber highlight
      this.canvas.style.cursor = "pointer";
      return;
    } else {
      this.hoveredSocket = null;
      this.canvas.style.cursor = "default";
      // Reset gizmo colors
      for (const child of this.socketGizmoGroup.children) {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshBasicMaterial).color.setHex(0x00ffff);
        }
      }
    }

    // Raycast against walls
    this.hoveredWall = null;
    // @ts-ignore
    const tilesMap = this.courseManager["tiles"] as Map<string, any>;
    if (!tilesMap) return;

    const wallMeshes: THREE.Object3D[] = [];
    for (const [id, tile] of tilesMap.entries()) {
      if (tile.wallLMesh && tile.wallLMesh.visible) wallMeshes.push(tile.wallLMesh);
      if (tile.wallRMesh && tile.wallRMesh.visible) wallMeshes.push(tile.wallRMesh);
    }

    const wallIntersects = this.raycaster.intersectObjects(wallMeshes, true);
    if (wallIntersects.length > 0) {
      const hit = wallIntersects[0].object;
      let isLeft = false;
      for (const [id, tile] of tilesMap.entries()) {
        const matchesWall = (rootWall?: THREE.Object3D) => {
          if (!rootWall) return false;
          let cur: THREE.Object3D | null = hit;
          while (cur) {
            if (cur === rootWall) return true;
            cur = cur.parent;
          }
          return false;
        };
        if (matchesWall(tile.wallLMesh)) {
          isLeft = true;
          this.hoveredWall = { tileInstanceId: id, side: "left", mesh: hit as THREE.Mesh };
          this.canvas.style.cursor = "pointer";
          break;
        }
        if (matchesWall(tile.wallRMesh)) {
          isLeft = false;
          this.hoveredWall = { tileInstanceId: id, side: "right", mesh: hit as THREE.Mesh };
          this.canvas.style.cursor = "pointer";
          break;
        }
      }
    }
  };

  private handleContextMenu = (ev: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const propGroups = this.courseManager.getAllProps?.().map((p) => p.group) || [];
    const propHits = this.raycaster.intersectObjects(propGroups, true);
    if (propHits.length > 0) {
      ev.preventDefault();
      let obj: THREE.Object3D | null = propHits[0].object;
      while (obj && !obj.userData?.propInstanceId) {
        obj = obj.parent;
      }
      const propInstanceId = obj?.userData?.propInstanceId;
      if (propInstanceId) {
        this.deleteProp(propInstanceId);
      }
    }
  };

  private handlePointerDown = (ev: PointerEvent): void => {
    if (ev.button !== 0) return; // Left click only

    // 0. Prop placement mode takes precedence when a prop is selected
    if (this.selectedPropId) {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

      // Raycast against placed tile groups first, falling back to ground plane Y=0
      // @ts-ignore
      const tilesMap = this.courseManager["tiles"] as Map<string, any>;
      const tileGroups = tilesMap ? Array.from(tilesMap.values()).map((t) => t.group) : [];
      const hits = this.raycaster.intersectObjects(tileGroups, true);
      const hitPoint = new THREE.Vector3();
      if (hits.length > 0) {
        hitPoint.copy(hits[0].point);
      } else if (!this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint)) {
        return;
      }

      this.placePropAtPoint(this.selectedPropId, hitPoint);
      return;
    }

    // 1. Socket click
    if (this.hoveredSocket) {
      this.onSocketClick?.(this.hoveredSocket, ev.clientX, ev.clientY);
      return;
    }

    // 2. Wall toggle click
    if (this.hoveredWall) {
      const { tileInstanceId, side } = this.hoveredWall;
      const cmd: EditorCommand = {
        name: `Toggle ${side} wall`,
        execute: () => {
          this.courseManager.toggleWall(tileInstanceId, side);
        },
        undo: () => {
          this.courseManager.toggleWall(tileInstanceId, side);
        },
      };
      this.history.execute(cmd);
      this.onCourseModified?.();
    }
  };

  public placePropAtPoint(propId: string, point: THREE.Vector3): void {
    const propData: PlacedProp = {
      instanceId: `prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      propId,
      position: [point.x, point.y, point.z],
      rotation: [0, this.propRotationY, 0],
      scale: [1, 1, 1],
    };

    const cmd: EditorCommand = {
      name: `Place ${propId}`,
      execute: () => {
        this.courseManager.addProp(propData);
      },
      undo: () => {
        this.courseManager.removeProp(propData.instanceId);
      },
    };
    this.history.execute(cmd);
    this.onPropPlaced?.(propData);
    this.onCourseModified?.();
  }

  public deleteProp(propInstanceId: string): void {
    const existing = this.courseManager.getProp?.(propInstanceId);
    if (!existing) return;
    const savedData: PlacedProp = {
      ...existing.propData,
      position: [...existing.propData.position] as [number, number, number],
      rotation: [...existing.propData.rotation] as [number, number, number],
      scale: [...existing.propData.scale] as [number, number, number],
    };

    const cmd: EditorCommand = {
      name: `Remove ${savedData.propId}`,
      execute: () => {
        this.courseManager.removeProp(propInstanceId);
      },
      undo: () => {
        this.courseManager.addProp(savedData);
      },
    };
    this.history.execute(cmd);
    this.onCourseModified?.();
  }

  /**
   * Snaps a new kit piece onto an open socket using exact SocketSolver transforms.
   */
  public snapPieceToSocket(targetSocket: OpenSocketInfo, newKitPieceId: string): void {
    const template = this.assetLoader.getPiece(newKitPieceId);
    if (!template) return;

    const inSocket = template.sockets.find((s) => s.id === "LOC_Socket_In") || template.sockets[0];
    if (!inSocket) return;

    // @ts-ignore
    const tilesMap = this.courseManager["tiles"] as Map<string, any>;
    const parentTile = tilesMap?.get(targetSocket.tileInstanceId);

    let newPos: THREE.Vector3;
    let rotationY: number;

    if (parentTile && parentTile.pieceTemplate?.sockets) {
      const parentSocket = parentTile.pieceTemplate.sockets.find(
        (s: any) => s.id === targetSocket.socketId
      );
      if (parentSocket) {
        parentTile.group.updateMatrixWorld(true);
        const snappedMatrix = SocketSolver.computeSnappedTransform(
          parentTile.group.matrixWorld,
          parentSocket,
          inSocket
        );
        const pos = new THREE.Vector3();
        const quat = new THREE.Quaternion();
        snappedMatrix.decompose(pos, quat, new THREE.Vector3());
        const euler = new THREE.Euler().setFromQuaternion(quat, "YXZ");
        newPos = pos;
        rotationY = Math.round(((euler.y * 180) / Math.PI) % 360);
      } else {
        newPos = targetSocket.worldPosition.clone();
        rotationY = 0;
      }
    } else {
      const targetNorm = targetSocket.normal.clone();
      const inNorm = new THREE.Vector3(...inSocket.normal);
      const targetAngle = Math.atan2(targetNorm.x, targetNorm.z);
      const desiredAngle = targetAngle + Math.PI;
      const inAngle = Math.atan2(inNorm.x, inNorm.z);
      rotationY = Math.round(((desiredAngle - inAngle) * 180) / Math.PI);

      const rotatedInPos = new THREE.Vector3(...inSocket.position);
      rotatedInPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), (rotationY * Math.PI) / 180);
      newPos = targetSocket.worldPosition.clone().sub(rotatedInPos);
    }

    const newInstanceId = `tile_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newTileData: PlacedTile = {
      instanceId: newInstanceId,
      kitPieceId: newKitPieceId,
      position: [newPos.x, newPos.y, newPos.z],
      rotationY: ((rotationY % 360) + 360) % 360,
      walls: { left: true, right: true },
      connectedSockets: {
        [inSocket.id]: targetSocket.tileInstanceId,
      },
    };

    const pieceLabel = template.metadata?.name || (template as any).name || newKitPieceId;
    const cmd: EditorCommand = {
      name: `Add ${pieceLabel}`,
      execute: () => {
        this.courseManager.addTile(newTileData, true);
        // @ts-ignore
        const targetTile = this.courseManager["tiles"].get(targetSocket.tileInstanceId);
        if (targetTile) {
          targetTile.tileData.connectedSockets = targetTile.tileData.connectedSockets || {};
          targetTile.tileData.connectedSockets[targetSocket.socketId] = newInstanceId;
        }
        this.refreshOpenSockets();
      },
      undo: () => {
        // @ts-ignore
        const targetTile = this.courseManager["tiles"].get(targetSocket.tileInstanceId);
        if (targetTile && targetTile.tileData.connectedSockets) {
          delete targetTile.tileData.connectedSockets[targetSocket.socketId];
        }
        // @ts-ignore
        const instantiated = this.courseManager["tiles"].get(newInstanceId);
        if (instantiated) {
          this.scene.remove(instantiated.group);
          // @ts-ignore
          this.courseManager["tiles"].delete(newInstanceId);
          this.courseManager.rebuildWeldedFloorPhysics();
        }
        this.refreshOpenSockets();
      },
    };

    this.history.execute(cmd);
    this.onCourseModified?.();
  }

  public setGizmosVisible(visible: boolean): void {
    this.socketGizmoGroup.visible = visible;
  }

  public dispose(): void {
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.handleKeyDown);
    }
    this.scene.remove(this.socketGizmoGroup);
    this.history.clear();
  }
}

