/**
 * EditorController.ts
 * Manages 3D raycasting, open socket visual gizmos, piece snapping math, and wall toggles.
 */

import * as THREE from "three";
import type { CourseManager } from "../course/CourseManager";
import type { AssetLoader } from "../kitbash/AssetLoader";
import type { PlacedTile, HoleData } from "../types/CourseSchema";
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

  public onSocketClick?: (info: OpenSocketInfo, screenX: number, screenY: number) => void;
  public onCourseModified?: () => void;

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

  private attachEventListeners(): void {
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);

    // Keyboard shortcuts
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", (ev) => {
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
        }
      });
    }
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

    const wallMeshes: THREE.Mesh[] = [];
    for (const [id, tile] of tilesMap.entries()) {
      if (tile.wallLMesh && tile.wallLMesh.visible) wallMeshes.push(tile.wallLMesh);
      if (tile.wallRMesh && tile.wallRMesh.visible) wallMeshes.push(tile.wallRMesh);
    }

    const wallIntersects = this.raycaster.intersectObjects(wallMeshes);
    if (wallIntersects.length > 0) {
      const hit = wallIntersects[0].object as THREE.Mesh;
      const isLeft = hit.name === "Mesh_Wall_L";
      // Find parent tile instance
      for (const [id, tile] of tilesMap.entries()) {
        if (tile.wallLMesh === hit || tile.wallRMesh === hit) {
          this.hoveredWall = { tileInstanceId: id, side: isLeft ? "left" : "right", mesh: hit };
          this.canvas.style.cursor = "pointer";
          break;
        }
      }
    }
  };

  private handlePointerDown = (ev: PointerEvent): void => {
    if (ev.button !== 0) return; // Left click only

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

  /**
   * Snaps a new kit piece onto an open socket.
   */
  public snapPieceToSocket(targetSocket: OpenSocketInfo, newKitPieceId: string): void {
    const template = this.assetLoader.getPiece(newKitPieceId);
    if (!template) return;

    // Incoming socket on the new piece (usually LOC_Socket_In)
    const inSocket = template.sockets.find((s) => s.id === "LOC_Socket_In") || template.sockets[0];
    if (!inSocket) return;

    // In Three.js: Target socket outward normal is N_target
    // We want the new piece's incoming socket normal N_in to point in -N_target
    const targetNorm = targetSocket.normal.clone();
    const inNorm = new THREE.Vector3(...inSocket.normal);

    // Calculate rotation angle around Y
    const targetAngle = Math.atan2(targetNorm.x, targetNorm.z);
    // Opposing angle
    const desiredAngle = targetAngle + Math.PI;
    const inAngle = Math.atan2(inNorm.x, inNorm.z);
    const rotationY = Math.round(((desiredAngle - inAngle) * 180) / Math.PI);

    // Rotate incoming socket local offset
    const rotatedInPos = new THREE.Vector3(...inSocket.position);
    rotatedInPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), (rotationY * Math.PI) / 180);

    // World position of new piece
    const newPos = targetSocket.worldPosition.clone().sub(rotatedInPos);

    const newInstanceId = `tile_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const newTileData: PlacedTile = {
      instanceId: newInstanceId,
      kitPieceId: newKitPieceId,
      position: [newPos.x, newPos.y, newPos.z],
      rotationY: (rotationY % 360 + 360) % 360,
      walls: { left: true, right: true },
      connectedSockets: {
        [inSocket.id]: targetSocket.tileInstanceId,
      },
    };

    const cmd: EditorCommand = {
      name: `Add ${template.name}`,
      execute: () => {
        this.courseManager.addTile(newTileData, true);
        // Connect reverse socket on target tile
        // @ts-ignore
        const targetTile = this.courseManager["tiles"].get(targetSocket.tileInstanceId);
        if (targetTile) {
          targetTile.tileData.connectedSockets[targetSocket.socketId] = newInstanceId;
        }
        this.refreshOpenSockets();
      },
      undo: () => {
        // @ts-ignore
        const targetTile = this.courseManager["tiles"].get(targetSocket.tileInstanceId);
        if (targetTile) {
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
    this.scene.remove(this.socketGizmoGroup);
    this.history.clear();
  }
}

