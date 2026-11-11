/**
 * EditorController.ts
 * Manages 3D raycasting, open socket visual gizmos, socket snapping,
 * ghost prop preview, prop selection/move/rotate, and dedicated erase tools.
 */

import * as THREE from "three";
import type { CourseManager } from "../course/CourseManager";
import { SocketSolver } from "../course/SocketSolver";
import type { AssetLoader } from "../kitbash/AssetLoader";
import type {
  HoleData,
  PlacedTile,
  PlacedProp,
  SplinePathData,
  SplineWaypoint,
} from "../types/CourseSchema";
import { getPiecePropRole } from "../types/KitTypes";
import { HistoryManager, type EditorCommand } from "./HistoryManager";
import {
  ELEVATION_STEP_METERS,
  cloneSplinePath,
  getElevationStep,
} from "../spline/SplineMath";
import {
  deriveSplineFromTiles,
  resolveOrderedTileChain,
  syncSplineAfterSocketChange,
} from "../spline/SplineTrackSync";
import { fitTilesToSpline } from "../spline/DiscreteKitFitter";
import { SplineOverlay } from "../spline/SplineOverlay";

export interface OpenSocketInfo {
  tileInstanceId: string;
  socketId: string;
  worldPosition: THREE.Vector3;
  normal: THREE.Vector3;
  elevation: number;
}

export interface SelectedSplineNodeInfo {
  index: number;
  nodeCount: number;
  elevationStep: number;
  elevationMeters: number;
  corner: boolean;
  isRoot: boolean;
  canDelete: boolean;
}

export type EditorToolMode = "select" | "place_prop" | "erase" | "track_path";

export interface TileClickInfo {
  tileInstanceId: string;
  kitPieceId: string;
  name: string;
  walls: { left: boolean; right: boolean };
  hasDynamicWalls: boolean;
  isGap: boolean;
  isTee: boolean;
  isCup: boolean;
  hasDownstream: boolean;
}

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
  private gapGizmoGroup: THREE.Group;
  private ghostGroup: THREE.Group;
  private selectionRing: THREE.Mesh;
  private raycaster: THREE.Raycaster;
  private hoveredSocket: OpenSocketInfo | null = null;

  private selectedPropId: string | null = null;
  private propRotationY: number = 0;
  private eraseMode: boolean = false;
  private trackPathMode: boolean = false;
  private enabled: boolean = true;
  private activeTheme: string = "carnival_park";
  private selectedPlacedPropId: string | null = null;

  // Spline Track Editor state
  private splineOverlay: SplineOverlay;
  private activeSpline: SplinePathData | null = null;
  private selectedSplineNodeIndex: number = 0;
  private draggingSpline: {
    kind: "node" | "handle";
    nodeIndex: number;
    initialHole: HoleData;
    workingSpline: SplinePathData;
    planeY: number;
    moved: boolean;
  } | null = null;

  // Prop drag state
  private draggingProp: {
    instanceId: string;
    startPos: [number, number, number];
    startRot: [number, number, number];
    moved: boolean;
  } | null = null;

  private groundPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.0);

  public onSocketClick?: (info: OpenSocketInfo, screenX: number, screenY: number) => void;
  public onTileClick?: (info: TileClickInfo, screenX: number, screenY: number) => void;
  public onCourseModified?: () => void;
  public onPropPlaced?: (prop: PlacedProp) => void;
  public onSplineSelectionChanged?: (info: SelectedSplineNodeInfo | null) => void;
  public onToolStateChanged?: (state: {
    tool: EditorToolMode;
    selectedPropId: string | null;
    selectedPlacedPropId: string | null;
    eraseMode: boolean;
    trackPathMode: boolean;
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

    this.gapGizmoGroup = new THREE.Group();
    this.gapGizmoGroup.name = "Editor_GapGizmos";
    this.scene.add(this.gapGizmoGroup);

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

    this.splineOverlay = new SplineOverlay(this.scene);

    this.attachEventListeners();
  }

  public get toolMode(): EditorToolMode {
    if (this.trackPathMode) return "track_path";
    if (this.eraseMode) return "erase";
    if (this.selectedPropId) return "place_prop";
    return "select";
  }

  public get isEraseMode(): boolean {
    return this.eraseMode;
  }

  public get isTrackPathMode(): boolean {
    return this.trackPathMode;
  }

  public getSelectedPlacedPropId(): string | null {
    return this.selectedPlacedPropId;
  }

  public getSelectedSplineNodeInfo(): SelectedSplineNodeInfo | null {
    if (!this.trackPathMode || !this.activeSpline || this.activeSpline.nodes.length === 0) {
      return null;
    }
    const idx = Math.max(0, Math.min(this.selectedSplineNodeIndex, this.activeSpline.nodes.length - 1));
    const node = this.activeSpline.nodes[idx];
    const step = getElevationStep(node);
    return {
      index: idx,
      nodeCount: this.activeSpline.nodes.length,
      elevationStep: step,
      elevationMeters: step * ELEVATION_STEP_METERS,
      corner: Boolean(node.corner),
      isRoot: idx === 0,
      canDelete: idx > 0 && this.activeSpline.nodes.length > 2,
    };
  }

  public setTheme(theme: string): void {
    this.activeTheme = theme;
  }

  private emitToolState(): void {
    this.onToolStateChanged?.({
      tool: this.toolMode,
      selectedPropId: this.selectedPropId,
      selectedPlacedPropId: this.selectedPlacedPropId,
      eraseMode: this.eraseMode,
      trackPathMode: this.trackPathMode,
    });
  }

  private emitSplineSelection(): void {
    this.onSplineSelectionChanged?.(this.getSelectedSplineNodeInfo());
  }

  public undo(): boolean {
    const ok = this.history.undo();
    if (!ok) return false;
    this.clearSelectionIfMissing();
    this.refreshOpenSockets();
    this.syncSplineFromCourse();
    this.onCourseModified?.();
    return true;
  }

  public redo(): boolean {
    const ok = this.history.redo();
    if (!ok) return false;
    this.clearSelectionIfMissing();
    this.refreshOpenSockets();
    this.syncSplineFromCourse();
    this.onCourseModified?.();
    return true;
  }

  private handleKeyDown = (ev: KeyboardEvent): void => {
    if (!this.enabled) return;
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if ((ev.ctrlKey || ev.metaKey) && ev.key === "z") {
      ev.preventDefault();
      if (ev.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
    } else if ((ev.ctrlKey || ev.metaKey) && ev.key === "y") {
      ev.preventDefault();
      this.redo();
    } else if (ev.key === "r" || ev.key === "R") {
      if (this.selectedPlacedPropId && !this.selectedPropId && !this.eraseMode) {
        this.rotatePlacedProp(this.selectedPlacedPropId, 45);
      } else {
        this.propRotationY = (this.propRotationY + 45) % 360;
        this.ghostGroup.rotation.y = (this.propRotationY * Math.PI) / 180;
      }
    } else if (ev.key === "t" || ev.key === "T") {
      this.setTrackPathMode(!this.trackPathMode);
    } else if (ev.key === "x" || ev.key === "X") {
      this.setEraseMode(!this.eraseMode);
    } else if (ev.key === "Delete" || ev.key === "Backspace") {
      if (this.trackPathMode) {
        ev.preventDefault();
        this.deleteSelectedSplineNode();
      } else if (this.selectedPlacedPropId) {
        ev.preventDefault();
        const id = this.selectedPlacedPropId;
        this.selectPlacedProp(null);
        this.deleteProp(id);
      }
    } else if (ev.key === "Escape") {
      this.setTrackPathMode(false);
      this.setEraseMode(false);
      this.setSelectedProp(null);
      this.selectPlacedProp(null);
    }
  };

  private attachEventListeners(): void {
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("dblclick", this.handleDoubleClick);

    if (typeof window !== "undefined") {
      window.addEventListener("pointerup", this.handlePointerUp);
      window.addEventListener("keydown", this.handleKeyDown);
    }
  }

  public setTrackPathMode(enabled: boolean): void {
    this.trackPathMode = enabled;
    if (enabled) {
      this.eraseMode = false;
      this.selectedPropId = null;
      this.rebuildGhostPreview();
      this.selectPlacedProp(null);
      this.socketGizmoGroup.visible = false;
      this.gapGizmoGroup.visible = false;
      this.syncSplineFromCourse();
      if (this.activeSpline && this.activeSpline.nodes.length > 0) {
        this.selectedSplineNodeIndex = this.activeSpline.nodes.length - 1;
      }
      this.splineOverlay.setVisible(true);
      this.refreshSplineOverlay();
    } else {
      this.draggingSpline = null;
      this.splineOverlay.setVisible(false);
      this.socketGizmoGroup.visible = this.enabled;
      this.gapGizmoGroup.visible = this.enabled;
      this.refreshOpenSockets();
      this.onSplineSelectionChanged?.(null);
    }
    this.emitToolState();
  }

  public setSelectedProp(propId: string | null): void {
    this.selectedPropId = propId;
    if (propId) {
      this.eraseMode = false;
      if (this.trackPathMode) this.setTrackPathMode(false);
      this.selectPlacedProp(null);
    }
    this.rebuildGhostPreview();
    this.emitToolState();
  }

  public setEraseMode(enabled: boolean): void {
    this.eraseMode = enabled;
    if (enabled) {
      this.selectedPropId = null;
      if (this.trackPathMode) this.setTrackPathMode(false);
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

  public syncSplineFromCourse(): SplinePathData | null {
    if (typeof this.courseManager.exportHoleData !== "function") return null;
    const stored = this.courseManager.getSplinePath?.() || null;
    const tiles = this.courseManager.exportHoleData().tiles;
    const synced =
      stored && stored.nodes.length >= 2
        ? cloneSplinePath(stored)
        : deriveSplineFromTiles(tiles, this.assetLoader);
    this.courseManager.setSplinePath?.(synced);
    this.activeSpline = synced;
    if (synced.nodes.length > 0) {
      this.selectedSplineNodeIndex = Math.max(
        0,
        Math.min(this.selectedSplineNodeIndex, synced.nodes.length - 1)
      );
    }
    if (this.trackPathMode) {
      this.refreshSplineOverlay();
    }
    return this.activeSpline;
  }

  private refreshSplineOverlay(isDragging: boolean = false): void {
    if (!this.trackPathMode || !this.activeSpline) return;
    this.splineOverlay.renderOverlay(
      this.activeSpline.nodes,
      this.selectedSplineNodeIndex,
      isDragging
    );
    this.emitSplineSelection();
  }

  private getPointOnPlane(clientX: number, clientY: number, planeY: number): THREE.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const pt = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(plane, pt) ? pt : null;
  }

  private commitSplineEdit(
    commandName: string,
    oldHole: HoleData,
    draftSpline: SplinePathData,
    nextSelectedIdx?: number
  ): void {
    const fit = fitTilesToSpline(
      draftSpline,
      oldHole.tiles,
      this.activeTheme,
      this.assetLoader
    );

    const nextSpline: SplinePathData = {
      closed: false,
      nodes: fit.snappedNodes,
    };
    const newHole: HoleData = {
      ...oldHole,
      teeTileId: fit.tiles[0]?.instanceId || oldHole.teeTileId,
      cupTileId:
        fit.tiles.find((t) => t.kitPieceId.includes("cup"))?.instanceId ||
        fit.tiles[fit.tiles.length - 1]?.instanceId ||
        "",
      tiles: fit.tiles,
      splinePath: nextSpline,
    };

    const targetSelect =
      typeof nextSelectedIdx === "number"
        ? Math.max(0, Math.min(nextSelectedIdx, nextSpline.nodes.length - 1))
        : Math.max(0, Math.min(this.selectedSplineNodeIndex, nextSpline.nodes.length - 1));
    const prevSelect = this.selectedSplineNodeIndex;

    const cmd: EditorCommand = {
      name: commandName,
      execute: () => {
        this.courseManager.loadHole(newHole);
        this.activeSpline = cloneSplinePath(nextSpline);
        this.selectedSplineNodeIndex = targetSelect;
        this.refreshOpenSockets();
        this.refreshSplineOverlay();
      },
      undo: () => {
        this.courseManager.loadHole(oldHole);
        this.activeSpline = oldHole.splinePath
          ? cloneSplinePath(oldHole.splinePath)
          : deriveSplineFromTiles(oldHole.tiles, this.assetLoader);
        this.selectedSplineNodeIndex = Math.max(
          0,
          Math.min(prevSelect, this.activeSpline.nodes.length - 1)
        );
        this.refreshOpenSockets();
        this.refreshSplineOverlay();
      },
    };

    this.history.execute(cmd);
    this.onCourseModified?.();
  }

  public stepSelectedNodeElevation(deltaStep: 1 | -1): boolean {
    if (!this.trackPathMode) return false;
    const spline = this.activeSpline || this.syncSplineFromCourse();
    if (!spline || spline.nodes.length === 0) return false;

    const idx = Math.max(0, Math.min(this.selectedSplineNodeIndex, spline.nodes.length - 1));
    const oldHole = this.courseManager.exportHoleData(3, 1);
    oldHole.splinePath = cloneSplinePath(spline);

    const draft = cloneSplinePath(spline);
    const node = draft.nodes[idx];
    const nextStep = Math.max(-3, Math.min(4, getElevationStep(node) + deltaStep));
    if (nextStep === getElevationStep(node)) return false;

    node.elevationStep = nextStep;
    node.position[1] = nextStep * ELEVATION_STEP_METERS;
    this.commitSplineEdit(`Step elevation (${deltaStep > 0 ? "+" : "-"}1.5m)`, oldHole, draft, idx);
    return true;
  }

  public toggleSelectedNodeCorner(): boolean {
    if (!this.trackPathMode) return false;
    const spline = this.activeSpline || this.syncSplineFromCourse();
    if (!spline || spline.nodes.length === 0) return false;

    const idx = Math.max(0, Math.min(this.selectedSplineNodeIndex, spline.nodes.length - 1));
    const oldHole = this.courseManager.exportHoleData(3, 1);
    oldHole.splinePath = cloneSplinePath(spline);

    const draft = cloneSplinePath(spline);
    draft.nodes[idx].corner = !draft.nodes[idx].corner;
    this.commitSplineEdit("Toggle spline corner", oldHole, draft, idx);
    return true;
  }

  public insertSplineWaypointAt(worldPoint: THREE.Vector3): boolean {
    if (!this.trackPathMode) return false;
    const spline = this.activeSpline || this.syncSplineFromCourse();
    if (!spline || spline.nodes.length === 0) return false;

    const oldHole = this.courseManager.exportHoleData(3, 1);
    oldHole.splinePath = cloneSplinePath(spline);

    const draft = cloneSplinePath(spline);
    const insertAfterIdx = Math.max(
      0,
      Math.min(this.selectedSplineNodeIndex, draft.nodes.length - 1)
    );
    const anchor = draft.nodes[insertAfterIdx];
    const step = getElevationStep(anchor);
    const anchorY = step * ELEVATION_STEP_METERS;

    let handleX = anchor.handleOffset[0];
    let handleZ = anchor.handleOffset[1];
    if (insertAfterIdx < draft.nodes.length - 1) {
      const nextNode = draft.nodes[insertAfterIdx + 1];
      const chord = new THREE.Vector2(
        nextNode.position[0] - anchor.position[0],
        nextNode.position[2] - anchor.position[2]
      );
      if (chord.lengthSq() > 1e-4) {
        chord.normalize().multiplyScalar(2.4);
        handleX = chord.x;
        handleZ = chord.y;
      }
    } else {
      const dir = new THREE.Vector2(
        worldPoint.x - anchor.position[0],
        worldPoint.z - anchor.position[2]
      );
      if (dir.lengthSq() > 1e-4) {
        dir.normalize().multiplyScalar(2.4);
        handleX = dir.x;
        handleZ = dir.y;
      }
    }

    const newNode: SplineWaypoint = {
      id: `wp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      position: [worldPoint.x, anchorY, worldPoint.z],
      handleOffset: [handleX, handleZ],
      corner: false,
      elevationStep: step,
    };

    const newIdx = insertAfterIdx + 1;
    draft.nodes.splice(newIdx, 0, newNode);
    this.commitSplineEdit("Insert spline waypoint", oldHole, draft, newIdx);
    return true;
  }

  public deleteSelectedSplineNode(): boolean {
    if (!this.trackPathMode) return false;
    const spline = this.activeSpline || this.syncSplineFromCourse();
    if (!spline || spline.nodes.length <= 2) return false;

    const idx = Math.max(0, Math.min(this.selectedSplineNodeIndex, spline.nodes.length - 1));
    if (idx === 0) return false; // Root Tee protected from Delete

    const oldHole = this.courseManager.exportHoleData(3, 1);
    oldHole.splinePath = cloneSplinePath(spline);

    const draft = cloneSplinePath(spline);
    draft.nodes.splice(idx, 1);
    const nextIdx = Math.max(0, Math.min(idx - 1, draft.nodes.length - 1));
    this.commitSplineEdit("Delete spline waypoint", oldHole, draft, nextIdx);
    return true;
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

    this.refreshGapGizmos();
  }

  private refreshGapGizmos(): void {
    while (this.gapGizmoGroup.children.length > 0) {
      const child = this.gapGizmoGroup.children[0];
      this.gapGizmoGroup.remove(child);
    }

    // @ts-ignore
    const tilesMap = this.courseManager["tiles"] as Map<string, any>;
    if (!tilesMap) return;

    for (const [instanceId, instantiated] of tilesMap.entries()) {
      const tileData: PlacedTile = instantiated.tileData;
      if (!tileData.isGap) continue;

      const template = instantiated.pieceTemplate;
      const group: THREE.Group = instantiated.group;
      const dims = template?.metadata?.dimensions || [6, 0.6, 6];
      const w = Math.max(2, dims[0]);
      const l = Math.max(2, dims[2]);

      const hitGeo = new THREE.BoxGeometry(w, 0.45, l);
      const hitMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);

      // Center hit box along the tile span (or midpoint between In/Out sockets if offset)
      const inSock = template?.sockets?.find((s: any) => s.id === "LOC_Socket_In");
      const outSock = template?.sockets?.find((s: any) => s.id === "LOC_Socket_Out");
      const centerLocal = new THREE.Vector3(0, 0.12, 0);
      if (inSock && outSock) {
        centerLocal.set(
          (inSock.position[0] + outSock.position[0]) * 0.5,
          (inSock.position[1] + outSock.position[1]) * 0.5 + 0.12,
          (inSock.position[2] + outSock.position[2]) * 0.5
        );
      }

      hitMesh.position.copy(centerLocal.applyEuler(group.rotation).add(group.position));
      hitMesh.rotation.copy(group.rotation);
      hitMesh.userData = { tileInstanceId: instanceId };

      const edges = new THREE.EdgesGeometry(hitGeo);
      const wire = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
      );
      wire.userData = { tileInstanceId: instanceId };
      hitMesh.add(wire);

      this.gapGizmoGroup.add(hitMesh);
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
    const targets: THREE.Object3D[] = tilesMap ? Array.from(tilesMap.values()).map((t) => t.group) : [];
    if (this.gapGizmoGroup.visible && this.gapGizmoGroup.children.length > 0) {
      targets.push(...this.gapGizmoGroup.children);
    }
    if (targets.length === 0) return null;
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length === 0) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && !obj.userData?.tileInstanceId) {
      obj = obj.parent;
    }
    return obj?.userData?.tileInstanceId || null;
  }

  public getTileClickInfo(tileInstanceId: string): TileClickInfo | null {
    // @ts-ignore
    const tilesMap = this.courseManager["tiles"] as Map<string, any>;
    const instantiated = tilesMap?.get(tileInstanceId);
    if (!instantiated) return null;

    const tileData: PlacedTile = instantiated.tileData;
    const idLower = tileData.kitPieceId.toLowerCase();
    const isTee = idLower.includes("tee");
    const isCup = idLower.includes("cup");

    let hasDownstream = false;
    const allTiles: PlacedTile[] = Array.from(tilesMap.values()).map((t) => t.tileData);
    const chain = resolveOrderedTileChain(allTiles, this.assetLoader);
    const chainIdx = chain.findIndex((c) => c.tile.instanceId === tileInstanceId);
    if (chainIdx >= 0 && chainIdx < chain.length - 1) {
      hasDownstream = true;
    } else {
      for (const [otherId, otherTile] of tilesMap.entries()) {
        if (otherId !== tileInstanceId && otherTile.tileData.attachedTo?.parentInstanceId === tileInstanceId) {
          hasDownstream = true;
          break;
        }
      }
    }

    return {
      tileInstanceId,
      kitPieceId: tileData.kitPieceId,
      name:
        instantiated.pieceTemplate?.metadata?.name ||
        instantiated.pieceTemplate?.name ||
        tileData.kitPieceId,
      walls: { ...tileData.walls },
      hasDynamicWalls: instantiated.pieceTemplate?.metadata?.hasDynamicWalls ?? true,
      isGap: Boolean(tileData.isGap),
      isTee,
      isCup,
      hasDownstream,
    };
  }

  private handlePointerMove = (ev: PointerEvent): void => {
    if (!this.enabled) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // 00. Spline Track Edit Mode hover & live drag
    if (this.trackPathMode) {
      if (this.draggingSpline) {
        const pt = this.getPointOnPlane(ev.clientX, ev.clientY, this.draggingSpline.planeY);
        if (pt) {
          const node = this.draggingSpline.workingSpline.nodes[this.draggingSpline.nodeIndex];
          if (this.draggingSpline.kind === "node") {
            node.position[0] = pt.x;
            node.position[2] = pt.z;
          } else {
            const dx = pt.x - node.position[0];
            const dz = pt.z - node.position[2];
            const len = Math.hypot(dx, dz);
            const clampedLen = Math.max(0.5, Math.min(14.0, len || 0.5));
            const scale = len > 1e-4 ? clampedLen / len : 1;
            node.handleOffset = [dx * scale, dz * scale];
            node.corner = false;
          }
          this.draggingSpline.moved = true;
          this.activeSpline = this.draggingSpline.workingSpline;
          this.refreshSplineOverlay(true);
          const preview = fitTilesToSpline(
            this.draggingSpline.workingSpline,
            this.draggingSpline.initialHole.tiles,
            this.activeTheme,
            this.assetLoader
          );
          this.splineOverlay.renderGhostSegments(preview.ghostSegments, this.assetLoader);
          this.canvas.style.cursor = "grabbing";
        }
        return;
      }

      const handleHits = this.raycaster.intersectObjects(this.splineOverlay.handleMeshes);
      const nodeHits = this.raycaster.intersectObjects(this.splineOverlay.nodeMeshes);
      this.canvas.style.cursor = handleHits.length > 0 || nodeHits.length > 0 ? "grab" : "crosshair";
      return;
    }

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

    // 4. Prop or track tile / gap hover cursor feedback
    const hoverProp = this.findHitPropId();
    const hoverTile = !hoverProp ? this.findHitTileId() : null;
    this.canvas.style.cursor = hoverProp || hoverTile ? "pointer" : "default";
  };

  private handlePointerDown = (ev: PointerEvent): void => {
    if (!this.enabled) return;
    if (ev.button !== 0) return; // Left click only (right/middle reserved for camera orbit)

    const rect = this.canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // -1. Spline Track Edit Mode click / begin drag
    if (this.trackPathMode) {
      const spline = this.activeSpline || this.syncSplineFromCourse();
      if (!spline) return;

      const handleHits = this.raycaster.intersectObjects(this.splineOverlay.handleMeshes);
      if (handleHits.length > 0) {
        const idx = handleHits[0].object.userData.splineHandleIndex as number;
        this.selectedSplineNodeIndex = idx;
        const oldHole = this.courseManager.exportHoleData(3, 1);
        oldHole.splinePath = cloneSplinePath(spline);
        this.draggingSpline = {
          kind: "handle",
          nodeIndex: idx,
          initialHole: oldHole,
          workingSpline: cloneSplinePath(spline),
          planeY: spline.nodes[idx].position[1] + 0.68,
          moved: false,
        };
        this.refreshSplineOverlay();
        return;
      }

      const nodeHits = this.raycaster.intersectObjects(this.splineOverlay.nodeMeshes);
      if (nodeHits.length > 0) {
        const idx = nodeHits[0].object.userData.splineNodeIndex as number;
        this.selectedSplineNodeIndex = idx;
        const oldHole = this.courseManager.exportHoleData(3, 1);
        oldHole.splinePath = cloneSplinePath(spline);
        this.draggingSpline = {
          kind: "node",
          nodeIndex: idx,
          initialHole: oldHole,
          workingSpline: cloneSplinePath(spline),
          planeY: spline.nodes[idx].position[1] + 0.68,
          moved: false,
        };
        this.refreshSplineOverlay();
        return;
      }
      return;
    }

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

    // 4. Left-clicking any track tile (including its walls or gap wireframe) opens Tile Action Popover
    const hitTileId = this.findHitTileId();
    if (hitTileId) {
      this.selectPlacedProp(null);
      const info = this.getTileClickInfo(hitTileId);
      if (info) {
        this.onTileClick?.(info, ev.clientX, ev.clientY);
      }
      return;
    }

    // 5. Clicking empty space clears prop selection
    this.selectPlacedProp(null);
  };

  private handleDoubleClick = (ev: MouseEvent): void => {
    if (!this.enabled) return;
    if (!this.trackPathMode) return;
    const spline = this.activeSpline || this.syncSplineFromCourse();
    if (!spline || spline.nodes.length === 0) return;

    const idx = Math.max(0, Math.min(this.selectedSplineNodeIndex, spline.nodes.length - 1));
    const planeY = spline.nodes[idx].position[1];
    const pt = this.getPointOnPlane(ev.clientX, ev.clientY, planeY);
    if (pt) {
      this.insertSplineWaypointAt(pt);
    }
  };

  private handlePointerUp = (): void => {
    if (!this.enabled) {
      this.draggingSpline = null;
      this.draggingProp = null;
      return;
    }
    if (this.draggingSpline) {
      const drag = this.draggingSpline;
      this.draggingSpline = null;
      this.splineOverlay.clearGhost();
      this.canvas.style.cursor = "default";

      if (drag.moved) {
        this.commitSplineEdit(
          drag.kind === "node" ? "Move spline node" : "Adjust spline curve handle",
          drag.initialHole,
          drag.workingSpline,
          drag.nodeIndex
        );
      } else {
        this.refreshSplineOverlay(false);
      }
      return;
    }

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

    const prevSpline = this.courseManager.getSplinePath?.() || null;

    const cmd: EditorCommand = {
      name: `Remove ${savedTile.kitPieceId}`,
      execute: () => {
        this.courseManager.removeTile(tileInstanceId);
        if (typeof this.courseManager.exportHoleData === "function") {
          const synced = syncSplineAfterSocketChange(
            prevSpline,
            this.courseManager.exportHoleData().tiles,
            this.assetLoader
          );
          this.courseManager.setSplinePath?.(synced);
          this.activeSpline = synced;
        }
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
        this.courseManager.setSplinePath?.(prevSpline);
        this.activeSpline = prevSpline;
        this.refreshOpenSockets();
      },
    };

    this.history.execute(cmd);
    this.onCourseModified?.();
    return true;
  }

  public toggleTileWall(tileInstanceId: string, side: "left" | "right"): boolean {
    // @ts-ignore
    const tilesMap = this.courseManager["tiles"] as Map<string, any>;
    const existing = tilesMap?.get(tileInstanceId);
    if (!existing || existing.tileData.isGap) return false;

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
    return true;
  }

  public toggleTileGap(tileInstanceId: string): boolean {
    // @ts-ignore
    const tilesMap = this.courseManager["tiles"] as Map<string, any>;
    const existing = tilesMap?.get(tileInstanceId);
    if (!existing) return false;

    const idLower = existing.tileData.kitPieceId.toLowerCase();
    if (idLower.includes("tee") || idLower.includes("cup")) return false;

    const prevGap = Boolean(existing.tileData.isGap);
    const nextGap = !prevGap;
    const prevSpline = this.courseManager.getSplinePath?.() || null;

    const cmd: EditorCommand = {
      name: nextGap ? `Remove tile surface (Gap)` : `Restore tile surface`,
      execute: () => {
        this.courseManager.setTileGap(tileInstanceId, nextGap);
        this.courseManager.setSplinePath?.(prevSpline);
        this.activeSpline = prevSpline;
        this.refreshOpenSockets();
      },
      undo: () => {
        this.courseManager.setTileGap(tileInstanceId, prevGap);
        this.courseManager.setSplinePath?.(prevSpline);
        this.activeSpline = prevSpline;
        this.refreshOpenSockets();
      },
    };
    this.history.execute(cmd);
    this.onCourseModified?.();
    return true;
  }

  public swapTileType(
    tileInstanceId: string,
    newKitPieceId: string,
    options?: { reverseDirection?: boolean }
  ): boolean {
    const oldHole = this.courseManager.exportHoleData?.();
    if (!oldHole) return false;

    const ok = this.courseManager.swapTileType(tileInstanceId, newKitPieceId, options);
    if (!ok) return false;

    const prevSpline = oldHole.splinePath || null;
    const updatedHole = this.courseManager.exportHoleData();
    const syncedSpline = syncSplineAfterSocketChange(
      prevSpline,
      updatedHole.tiles,
      this.assetLoader
    );
    updatedHole.splinePath = syncedSpline;
    this.courseManager.setSplinePath?.(syncedSpline);
    this.activeSpline = syncedSpline;
    this.refreshOpenSockets();

    let firstRun = true;
    const newTpl = this.assetLoader.getPiece(newKitPieceId);
    const label = newTpl?.metadata?.name || (newTpl as any)?.name || newKitPieceId;
    const cmd: EditorCommand = {
      name: `Swap tile to ${label}`,
      execute: () => {
        if (firstRun) {
          firstRun = false;
          return;
        }
        this.courseManager.loadHole(updatedHole);
        this.activeSpline = syncedSpline;
        this.refreshOpenSockets();
      },
      undo: () => {
        this.courseManager.loadHole(oldHole);
        this.activeSpline = oldHole.splinePath || null;
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
      attachedTo: {
        parentInstanceId: targetSocket.tileInstanceId,
        parentSocketId: targetSocket.socketId,
        childSocketId: inSocket.id,
      },
      connectedSockets: {
        [inSocket.id]: targetSocket.tileInstanceId,
      },
    };

    const prevSpline = this.courseManager.getSplinePath?.() || null;

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
        const synced = syncSplineAfterSocketChange(
          prevSpline,
          this.courseManager.exportHoleData?.().tiles || [],
          this.assetLoader
        );
        this.courseManager.setSplinePath?.(synced);
        this.activeSpline = synced;
        this.refreshOpenSockets();
      },
      undo: () => {
        // @ts-ignore
        const targetTile = this.courseManager["tiles"].get(targetSocket.tileInstanceId);
        if (targetTile && targetTile.tileData.connectedSockets) {
          delete targetTile.tileData.connectedSockets[targetSocket.socketId];
        }
        this.courseManager.removeTile(newInstanceId);
        this.courseManager.setSplinePath?.(prevSpline);
        this.activeSpline = prevSpline;
        this.refreshOpenSockets();
      },
    };

    this.history.execute(cmd);
    this.onCourseModified?.();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.hoveredSocket = null;
      this.draggingProp = null;
      this.draggingSpline = null;
      this.splineOverlay.clearGhost();
      this.ghostGroup.visible = false;
      this.selectionRing.visible = false;
      this.canvas.style.cursor = "default";
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setGizmosVisible(visible: boolean): void {
    this.setEnabled(visible);
    this.socketGizmoGroup.visible = visible && !this.trackPathMode;
    this.gapGizmoGroup.visible = visible && !this.trackPathMode;
    this.splineOverlay.setVisible(visible && this.trackPathMode);
    if (!visible) {
      this.ghostGroup.visible = false;
      this.selectionRing.visible = false;
    }
  }

  public dispose(): void {
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("dblclick", this.handleDoubleClick);
    if (typeof window !== "undefined") {
      window.removeEventListener("pointerup", this.handlePointerUp);
      window.removeEventListener("keydown", this.handleKeyDown);
    }
    this.splineOverlay.dispose();
    this.scene.remove(this.socketGizmoGroup);
    this.scene.remove(this.gapGizmoGroup);
    this.scene.remove(this.ghostGroup);
    this.scene.remove(this.selectionRing);
    this.history.clear();
  }
}
