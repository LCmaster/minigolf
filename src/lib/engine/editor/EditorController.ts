/**
 * EditorController.ts
 * Manages 3D raycasting, open socket visual gizmos, socket snapping,
 * ghost prop preview, prop selection/move/rotate, and dedicated erase tools.
 */

import * as THREE from "three";
import type { CourseManager } from "../course/CourseManager";
import { SocketSolver } from "../course/SocketSolver";
import type { AssetLoader } from "../kitbash/AssetLoader";
import type { PlacedTile, PlacedProp } from "../types/CourseSchema";
import { getPiecePropRole } from "../types/KitTypes";
import { HistoryManager, type EditorCommand } from "./HistoryManager";

export interface OpenSocketInfo {
  tileInstanceId: string;
  socketId: string;
  worldPosition: THREE.Vector3;
  normal: THREE.Vector3;
  elevation: number;
}

export type EditorToolMode = "select" | "place_prop" | "erase";

export class EditorController {
  private canvas: HTMLCanvasElement;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private courseManager: CourseManager;
  private assetLoader: AssetLoader;

  public history: HistoryManager;
  public openSockets: OpenSocketInfo[] = [];

  // Visual gizmos & previews
  private socketGizmoGroup: THREE.Group;
  private ghostGroup: THREE.Group;
  private selectionRing: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private hoveredSocket: OpenSocketInfo | null = null;
  private hoveredWall: { tileInstanceId: string; side: "left" | "right"; mesh: THREE.Mesh } | null = null;

  private selectedPropId: string | null = null;
  private propRotationY: number = 0;
  private eraseMode: boolean = false;
  private selectedPlacedPropId: string | null = null;

  // Prop drag state
  private draggingProp: {
    instanceId: string;
    startPos: [number, number, number];
    startRot: [number, number, number];
    moved: boolean;
  } | null = null;

  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.0);

  public onSocketClick?: (info: OpenSocketInfo, screenX: number, screenY: number) => void;
  public onCourseModified?: () => void;
  public onPropPlaced?: (prop: PlacedProp) => void;
  public onToolStateChanged?: (state: {
    tool: EditorToolMode;
    selectedPropId: string | null;
    selectedPlacedPropId: string | null;
    eraseMode: boolean;
  }) => void;

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

    this.ghostGroup = new THREE.Group();
    this.ghostGroup.name = "Editor_PropGhost";
    this.ghostGroup.visible = false;
    this.scene.add(this.ghostGroup);

    const selGeo = new THREE.TorusGeometry(1.1, 0.08, 12, 32);
    selGeo.rotateX(Math.PI / 2);
    const selMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.9,
    });
    this.selectionRing = new THREE.Mesh(selGeo, selMat);
    this.selectionRing.name = "Editor_SelectionRing";
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);

    this.attachEventListeners();
  }

  public get toolMode(): EditorToolMode {
    if (this.eraseMode) return "erase";
    if (this.selectedPropId) return "place_prop";
    return "select";
  }

  public get isEraseMode(): boolean {
    return this.eraseMode;
  }

  public getSelectedPlacedPropId(): string | null {
    return this.selectedPlacedPropId;
  }

  private emitToolState(): void {
    this.onToolStateChanged?.({
      tool: this.toolMode,
      selectedPropId: this.selectedPropId,
      selectedPlacedPropId: this.selectedPlacedPropId,
      eraseMode: this.eraseMode,
    });
  }

  private handleKeyDown = (ev: KeyboardEvent): void => {
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if ((ev.ctrlKey || ev.metaKey) && ev.key === "z") {
      ev.preventDefault();
      if (ev.shiftKey) {
        this.history.redo();
      } else {
        this.history.undo();
      }
      this.clearSelectionIfMissing();
      this.refreshOpenSockets();
      this.onCourseModified?.();
    } else if ((ev.ctrlKey || ev.metaKey) && ev.key === "y") {
      ev.preventDefault();
      this.history.redo();
      this.clearSelectionIfMissing();
      this.refreshOpenSockets();
      this.onCourseModified?.();
    } else if (ev.key === "r" || ev.key === "R") {
      if (this.selectedPlacedPropId && !this.selectedPropId && !this.eraseMode) {
        this.rotatePlacedProp(this.selectedPlacedPropId, 45);
      } else {
        this.propRotationY = (this.propRotationY + 45) % 360;
        this.ghostGroup.rotation.y = (this.propRotationY * Math.PI) / 180;
      }
    } else if (ev.key === "x" || ev.key === "X") {
      this.setEraseMode(!this.eraseMode);
    } else if (ev.key === "Delete" || ev.key === "Backspace") {
      if (this.selectedPlacedPropId) {
        ev.preventDefault();
        const id = this.selectedPlacedPropId;
        this.selectPlacedProp(null);
        this.deleteProp(id);
      }
    } else if (ev.key === "Escape") {
      this.setEraseMode(false);
      this.setSelectedProp(null);
      this.selectPlacedProp(null);
    }
  };

  private attachEventListeners(): void {
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);

    if (typeof window !== "undefined") {
      window.addEventListener("pointerup", this.handlePointerUp);
      window.addEventListener("keydown", this.handleKeyDown);
    }
  }

  public setSelectedProp(propId: string | null): void {
    this.selectedPropId = propId;
    if (propId) {
      this.eraseMode = false;
      this.selectPlacedProp(null);
    }
    this.rebuildGhostPreview();
    this.emitToolState();
  }

  public setEraseMode(enabled: boolean): void {
    this.eraseMode = enabled;
    if (enabled) {
      this.selectedPropId = null;
      this.rebuildGhostPreview();
      this.selectPlacedProp(null);
    }
    this.emitToolState();
  }

  public selectPlacedProp(instanceId: string | null): void {
    this.selectedPlacedPropId = instanceId;
    if (!instanceId) {
      this.selectionRing.visible = false;
    } else {
      const prop = this.courseManager.getProp?.(instanceId);
      if (prop) {
        this.selectionRing.position.copy(prop.group.position);
        this.selectionRing.position.y += 0.1;
        this.selectionRing.visible = true;
      } else {
        this.selectionRing.visible = false;
        this.selectedPlacedPropId = null;
      }
    }
    this.emitToolState();
  }

  private clearSelectionIfMissing(): void {
    if (this.selectedPlacedPropId && !this.courseManager.getProp?.(this.selectedPlacedPropId)) {
      this.selectPlacedProp(null);
    } else if (this.selectedPlacedPropId) {
      this.selectPlacedProp(this.selectedPlacedPropId);
    }
  }

  private rebuildGhostPreview(): void {
    while (this.ghostGroup.children.length > 0) {
      this.ghostGroup.remove(this.ghostGroup.children[0]);
    }
    this.ghostGroup.visible = false;

    if (!this.selectedPropId || typeof this.assetLoader?.getPiece !== "function") return;
    const template = this.assetLoader.getPiece(this.selectedPropId);
    if (!template || !template.visualTemplate) return;

    const propRole = getPiecePropRole(template.metadata);
    const ghostTint = propRole === "playable" ? 0xfbbf24 : 0x34d399;

    const ghostClone = template.visualTemplate.clone(true);
    ghostClone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.material = new THREE.MeshBasicMaterial({
          color: ghostTint,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        });
      }
    });
    this.ghostGroup.add(ghostClone);
    this.ghostGroup.rotation.y = (this.propRotationY * Math.PI) / 180;
    this.ghostGroup.visible = true;
  }

  public getPropRotationY(): number {
    return this.propRotationY;
  }

  public refreshOpenSockets(): void {
    this.openSockets = [];
    while (this.socketGizmoGroup.children.length > 0) {
      this.socketGizmoGroup.remove(this.socketGizmoGroup.children[0]);
    }

    // @ts-ignore
    const tilesMap = this.courseManager["tiles"] as Map<string, any>;
    if (!tilesMap) return;

    for (const [instanceId, instantiated] of tilesMap.entries()) {
      const tileData: PlacedTile = instantiated.tileData;
      const template = instantiated.pieceTemplate;
      const group = instantiated.group;

      for (const socket of template.sockets) {
        if (tileData.connectedSockets && tileData.connectedSockets[socket.id]) {
          continue;
        }

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
    const ringGeo = new THREE.TorusGeometry(0.8, 0.08, 16, 32);
    ringGeo.rotateX(Math.PI / 2);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.85,
    });

    const gizmo = new THREE.Mesh(ringGeo, ringMat);
    gizmo.position.copy(info.worldPosition);
    gizmo.position.y += 0.05;
    gizmo.userData = { socketInfo: info };

    this.socketGizmoGroup.add(gizmo);
  }

  private getSurfaceHitPoint(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // @ts-ignore
    const tilesMap = this.courseManager["tiles"] as Map<string, any>;
    const tileGroups = tilesMap ? Array.from(tilesMap.values()).map((t) => t.group) : [];
    const hits = this.raycaster.intersectObjects(tileGroups, true);
    if (hits.length > 0) {
      return hits[0].point.clone();
    }

    const hitPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint)) {
      return hitPoint;
    }
    return null;
  }

  private findHitPropId(): string | null {
    const propGroups = this.courseManager.getAllProps?.().map((p) => p.group) || [];
    if (propGroups.length === 0) return null;
    const propHits = this.raycaster.intersectObjects(propGroups, true);
    if (propHits.length === 0) return null;
    let obj: THREE.Object3D | null = propHits[0].object;
    while (obj && !obj.userData?.propInstanceId) {
      obj = obj.parent;
    }
    return obj?.userData?.propInstanceId || null;
  }

  private findHitTileId(): string | null {
    // @ts-ignore
    const tilesMap = this.courseManager["tiles"] as Map<string, any>;
    if (!tilesMap) return null;
    const tileGroups = Array.from(tilesMap.values()).map((t) => t.group);
    const hits = this.raycaster.intersectObjects(tileGroups, true);
    if (hits.length === 0) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && !obj.userData?.tileInstanceId) {
      obj = obj.parent;
    }
    return obj?.userData?.tileInstanceId || null;
  }

  private handlePointerMove = (ev: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // 0. Dragging existing placed prop
    if (this.draggingProp) {
      const pt = this.getSurfaceHitPoint(ev.clientX, ev.clientY);
      const inst = this.courseManager.getProp?.(this.draggingProp.instanceId);
      if (pt && inst) {
        inst.group.position.copy(pt);
        this.selectionRing.position.copy(pt);
        this.selectionRing.position.y += 0.1;
        this.draggingProp.moved = true;
        this.canvas.style.cursor = "grabbing";
      }
      return;
    }

    // 1. Ghost preview update when placing prop
    if (this.selectedPropId) {
      const pt = this.getSurfaceHitPoint(ev.clientX, ev.clientY);
      if (pt) {
        this.ghostGroup.position.copy(pt);
        this.ghostGroup.visible = true;
      }
      this.canvas.style.cursor = "crosshair";
      return;
    }

    // 2. Erase mode cursor feedback
    if (this.eraseMode) {
      const hitProp = this.findHitPropId();
      const hitTile = !hitProp ? this.findHitTileId() : null;
      this.canvas.style.cursor = hitProp || hitTile ? "pointer" : "crosshair";
      return;
    }

    // 3. Socket gizmo raycast
    const socketIntersects = this.raycaster.intersectObjects(this.socketGizmoGroup.children);
    if (socketIntersects.length > 0) {
      const hit = socketIntersects[0].object as THREE.Mesh;
      this.hoveredSocket = hit.userData.socketInfo;
      (hit.material as THREE.MeshBasicMaterial).color.setHex(0xffaa00);
      this.canvas.style.cursor = "pointer";
      return;
    } else {
      this.hoveredSocket = null;
      this.canvas.style.cursor = "default";
      for (const child of this.socketGizmoGroup.children) {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshBasicMaterial).color.setHex(0x00ffff);
        }
      }
    }

    // 4. Wall raycast
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
          this.hoveredWall = { tileInstanceId: id, side: "left", mesh: hit as THREE.Mesh };
          this.canvas.style.cursor = "pointer";
          break;
        }
        if (matchesWall(tile.wallRMesh)) {
          this.hoveredWall = { tileInstanceId: id, side: "right", mesh: hit as THREE.Mesh };
          this.canvas.style.cursor = "pointer";
          break;
        }
      }
    }
  };

  private handlePointerDown = (ev: PointerEvent): void => {
    if (ev.button !== 0) return; // Left click only (right/middle reserved for camera orbit)

    const rect = this.canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // 0. Erase mode
    if (this.eraseMode) {
      const hitPropId = this.findHitPropId();
      if (hitPropId) {
        this.deleteProp(hitPropId);
        return;
      }
      const hitTileId = this.findHitTileId();
      if (hitTileId) {
        this.deleteTile(hitTileId);
      }
      return;
    }

    // 1. Prop placement mode
    if (this.selectedPropId) {
      const hitPoint = this.getSurfaceHitPoint(ev.clientX, ev.clientY);
      if (hitPoint) {
        this.placePropAtPoint(this.selectedPropId, hitPoint);
      }
      return;
    }

    // 2. Socket click
    if (this.hoveredSocket) {
      this.selectPlacedProp(null);
      this.onSocketClick?.(this.hoveredSocket, ev.clientX, ev.clientY);
      return;
    }

    // 3. Select / begin drag on existing placed prop
    const hitPropId = this.findHitPropId();
    if (hitPropId) {
      this.selectPlacedProp(hitPropId);
      const inst = this.courseManager.getProp?.(hitPropId);
      if (inst) {
        this.draggingProp = {
          instanceId: hitPropId,
          startPos: [...inst.propData.position] as [number, number, number],
          startRot: [...inst.propData.rotation] as [number, number, number],
          moved: false,
        };
      }
      return;
    }

    // 4. Wall toggle click
    if (this.hoveredWall) {
      this.selectPlacedProp(null);
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
      return;
    }

    // 5. Clicking empty space clears prop selection
    this.selectPlacedProp(null);
  };

  private handlePointerUp = (): void => {
    if (!this.draggingProp) return;
    const drag = this.draggingProp;
    this.draggingProp = null;
    this.canvas.style.cursor = "default";

    if (!drag.moved) return;

    const inst = this.courseManager.getProp?.(drag.instanceId);
    if (!inst) return;
    const newPos: [number, number, number] = [
      inst.group.position.x,
      inst.group.position.y,
      inst.group.position.z,
    ];
    const rot: [number, number, number] = [...drag.startRot];

    const cmd: EditorCommand = {
      name: "Move prop",
      execute: () => {
        this.courseManager.updatePropTransform?.(drag.instanceId, newPos, rot);
        this.selectPlacedProp(drag.instanceId);
      },
      undo: () => {
        this.courseManager.updatePropTransform?.(drag.instanceId, drag.startPos, drag.startRot);
        this.selectPlacedProp(drag.instanceId);
      },
    };
    this.history.execute(cmd);
    this.onCourseModified?.();
  };

  public rotatePlacedProp(instanceId: string, deltaDeg: number): void {
    const inst = this.courseManager.getProp?.(instanceId);
    if (!inst) return;

    const oldPos: [number, number, number] = [...inst.propData.position];
    const oldRot: [number, number, number] = [...inst.propData.rotation];
    const newRot: [number, number, number] = [
      oldRot[0],
      ((oldRot[1] + deltaDeg) % 360 + 360) % 360,
      oldRot[2],
    ];

    const cmd: EditorCommand = {
      name: "Rotate prop",
      execute: () => {
        this.courseManager.updatePropTransform?.(instanceId, oldPos, newRot);
        this.selectPlacedProp(instanceId);
      },
      undo: () => {
        this.courseManager.updatePropTransform?.(instanceId, oldPos, oldRot);
        this.selectPlacedProp(instanceId);
      },
    };
    this.history.execute(cmd);
    this.onCourseModified?.();
  }

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

  public deleteTile(tileInstanceId: string): boolean {
    // @ts-ignore
    const tilesMap = this.courseManager["tiles"] as Map<string, any>;
    if (!tilesMap || tilesMap.size <= 1) return false; // Keep at least root tee tile

    const existing = tilesMap.get(tileInstanceId);
    if (!existing) return false;
    if (existing.tileData.kitPieceId.includes("tee") && Array.from(tilesMap.keys())[0] === tileInstanceId) {
      return false; // Protect starting tee box
    }

    const savedTile: PlacedTile = {
      ...existing.tileData,
      position: existing.tileData.position ? ([...existing.tileData.position] as [number, number, number]) : undefined,
      walls: { ...existing.tileData.walls },
      connectedSockets: existing.tileData.connectedSockets ? { ...existing.tileData.connectedSockets } : undefined,
    };

    // Capture incoming socket links from other tiles pointing to this tile so Undo restores them
    const incomingLinks: Array<{ tileId: string; socketId: string }> = [];
    for (const [otherId, otherTile] of tilesMap.entries()) {
      const conns = otherTile.tileData.connectedSockets;
      if (!conns) continue;
      for (const [sockId, targetId] of Object.entries(conns)) {
        if (targetId === tileInstanceId) {
          incomingLinks.push({ tileId: otherId, socketId: sockId });
        }
      }
    }

    const cmd: EditorCommand = {
      name: `Remove ${savedTile.kitPieceId}`,
      execute: () => {
        this.courseManager.removeTile(tileInstanceId);
        this.refreshOpenSockets();
      },
      undo: () => {
        const restored: PlacedTile = {
          ...savedTile,
          position: savedTile.position ? ([...savedTile.position] as [number, number, number]) : undefined,
          walls: { ...savedTile.walls },
          connectedSockets: savedTile.connectedSockets ? { ...savedTile.connectedSockets } : undefined,
        };
        this.courseManager.addTile(restored, true);
        for (const link of incomingLinks) {
          const parent = tilesMap.get(link.tileId);
          if (parent) {
            parent.tileData.connectedSockets = parent.tileData.connectedSockets || {};
            parent.tileData.connectedSockets[link.socketId] = tileInstanceId;
          }
        }
        this.refreshOpenSockets();
      },
    };

    this.history.execute(cmd);
    this.onCourseModified?.();
    return true;
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
        this.courseManager.removeTile(newInstanceId);
        this.refreshOpenSockets();
      },
    };

    this.history.execute(cmd);
    this.onCourseModified?.();
  }

  public setGizmosVisible(visible: boolean): void {
    this.socketGizmoGroup.visible = visible;
    if (!visible) {
      this.ghostGroup.visible = false;
      this.selectionRing.visible = false;
    }
  }

  public dispose(): void {
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    if (typeof window !== "undefined") {
      window.removeEventListener("pointerup", this.handlePointerUp);
      window.removeEventListener("keydown", this.handleKeyDown);
    }
    this.scene.remove(this.socketGizmoGroup);
    this.scene.remove(this.ghostGroup);
    this.scene.remove(this.selectionRing);
    this.history.clear();
  }
}
