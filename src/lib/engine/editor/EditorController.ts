/**
 * EditorController.ts
 * Manages 3D raycasting, open socket visual gizmos, socket snapping,
 * ghost prop preview, prop selection/move/rotate, and dedicated erase tools.
 */

import * as THREE from "three";
import type { CourseManager } from "../course/CourseManager";
import type { AssetLoader } from "../kitbash/AssetLoader";
import type { PlacedProp, SplinePathData } from "../types/CourseSchema";
import { getPiecePropRole, type PropRole } from "../types/KitTypes";
import { HistoryManager } from "./HistoryManager";
import { PropEditTool } from "./PropEditTool";
import { type GridSnapSize } from "../spline/PolylineMath";
import { SocketOverlayManager, type OpenSocketInfo } from "./SocketOverlayManager";
import { GapOverlayManager } from "./GapOverlayManager";
import { PathEditTool, type SelectedSplineNodeInfo } from "./PathEditTool";
import { TileEditCommands, type TileClickInfo } from "./TileEditCommands";

export type { OpenSocketInfo, SelectedSplineNodeInfo, TileClickInfo };

export type EditorToolMode = "select" | "place_prop" | "erase" | "track_path";

export class EditorController {
  private canvas: HTMLCanvasElement;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private courseManager: CourseManager;
  private assetLoader: AssetLoader;

  public history: HistoryManager;

  // Visual gizmos & previews
  private socketOverlay: SocketOverlayManager;
  private gapOverlay: GapOverlayManager;
  private propTool: PropEditTool;
  private pathTool: PathEditTool;
  private tileCommands: TileEditCommands;
  private raycaster: THREE.Raycaster;

  public get openSockets(): OpenSocketInfo[] {
    return this.socketOverlay.openSockets;
  }

  private eraseMode: boolean = false;
  private enabled: boolean = true;

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

    this.socketOverlay = new SocketOverlayManager(this.scene);
    this.gapOverlay = new GapOverlayManager(this.scene);
    this.propTool = new PropEditTool({
      scene: this.scene,
      courseManager: this.courseManager,
      assetLoader: this.assetLoader,
      history: this.history,
      onToolStateChanged: () => this.emitToolState(),
      onCourseModified: () => this.onCourseModified?.(),
      onPropPlaced: (prop) => this.onPropPlaced?.(prop),
    });

    this.pathTool = new PathEditTool({
      scene: this.scene,
      courseManager: this.courseManager,
      assetLoader: this.assetLoader,
      history: this.history,
      onRefreshOpenSockets: () => this.refreshOpenSockets(),
      onSplineSelectionChanged: (info) => this.onSplineSelectionChanged?.(info),
      onCourseModified: () => this.onCourseModified?.(),
    });

    this.tileCommands = new TileEditCommands({
      courseManager: this.courseManager,
      assetLoader: this.assetLoader,
      history: this.history,
      onSyncSpline: (spline) => this.pathTool.setActiveSpline(spline),
      onRefreshOpenSockets: () => this.refreshOpenSockets(),
      onCourseModified: () => this.onCourseModified?.(),
    });

    this.attachEventListeners();
  }

  public get toolMode(): EditorToolMode {
    if (this.pathTool.isActive()) return "track_path";
    if (this.eraseMode) return "erase";
    if (this.propTool.getSelectedPropId()) return "place_prop";
    return "select";
  }

  public get isEraseMode(): boolean {
    return this.eraseMode;
  }

  public get isTrackPathMode(): boolean {
    return this.pathTool.isActive();
  }

  public getSelectedPlacedPropId(): string | null {
    return this.propTool.getSelectedPlacedPropId();
  }

  public getSelectedSplineNodeInfo(): SelectedSplineNodeInfo | null {
    return this.pathTool.getSelectedNodeInfo();
  }

  public selectSplineNode(index: number): number {
    return this.pathTool.selectSplineNode(index);
  }

  public setActiveSpline(path: SplinePathData | null): void {
    this.pathTool.setActiveSpline(path);
  }

  public getActiveSpline(): SplinePathData | null {
    return this.pathTool.getActiveSpline();
  }

  public setTheme(theme: string): void {
    this.pathTool.setTheme(theme);
  }

  public getGridSnapSize(): GridSnapSize {
    return this.pathTool.getGridSnapSize();
  }

  public setGridSnapSize(size: GridSnapSize): void {
    this.pathTool.setGridSnapSize(size);
  }

  private emitToolState(): void {
    this.onToolStateChanged?.({
      tool: this.toolMode,
      selectedPropId: this.propTool.getSelectedPropId(),
      selectedPlacedPropId: this.propTool.getSelectedPlacedPropId(),
      eraseMode: this.eraseMode,
      trackPathMode: this.pathTool.isActive(),
    });
  }

  public undo(): boolean {
    const ok = this.history.undo();
    if (!ok) return false;
    this.propTool.clearSelectionIfMissing();
    this.refreshOpenSockets();
    this.syncSplineFromCourse();
    this.onCourseModified?.();
    return true;
  }

  public redo(): boolean {
    const ok = this.history.redo();
    if (!ok) return false;
    this.propTool.clearSelectionIfMissing();
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
      const placedId = this.propTool.getSelectedPlacedPropId();
      if (placedId && !this.propTool.getSelectedPropId() && !this.eraseMode) {
        this.propTool.rotatePlacedProp(placedId, 45);
      } else {
        this.propTool.rotateBrush(45);
      }
    } else if (ev.key === "t" || ev.key === "T") {
      this.setTrackPathMode(!this.pathTool.isActive());
    } else if (ev.key === "x" || ev.key === "X") {
      this.setEraseMode(!this.eraseMode);
    } else if (ev.key === "Delete" || ev.key === "Backspace") {
      const placedId = this.propTool.getSelectedPlacedPropId();
      if (this.pathTool.isActive()) {
        ev.preventDefault();
        this.deleteSelectedSplineNode();
      } else if (placedId) {
        ev.preventDefault();
        this.propTool.selectPlacedProp(null);
        this.propTool.deleteProp(placedId);
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
    if (enabled) {
      this.eraseMode = false;
      this.propTool.setSelectedProp(null, true);
      this.propTool.selectPlacedProp(null, true);
      this.socketOverlay.setVisible(false);
      this.gapOverlay.setVisible(false);
      this.pathTool.setActive(true);
    } else {
      this.socketOverlay.setVisible(this.enabled);
      this.gapOverlay.setVisible(this.enabled);
      this.pathTool.setActive(false);
    }
    this.emitToolState();
  }

  public setSelectedProp(propId: string | null): void {
    if (propId) {
      this.eraseMode = false;
      if (this.pathTool.isActive()) this.setTrackPathMode(false);
    }
    this.propTool.setSelectedProp(propId);
  }

  public setEraseMode(enabled: boolean): void {
    this.eraseMode = enabled;
    if (enabled) {
      if (this.pathTool.isActive()) this.setTrackPathMode(false);
      this.propTool.setSelectedProp(null, true);
      this.propTool.selectPlacedProp(null, true);
    }
    this.emitToolState();
  }

  public selectPlacedProp(instanceId: string | null): void {
    this.propTool.selectPlacedProp(instanceId);
  }

  public syncSplineFromCourse(): SplinePathData | null {
    return this.pathTool.syncFromCourse();
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

  public stepSelectedNodeElevation(deltaStep: 1 | -1): boolean {
    return this.pathTool.stepSelectedNodeElevation(deltaStep);
  }

  public setSelectedNodeBevelRadius(radiusMeters: number): boolean {
    return this.pathTool.setSelectedNodeBevelRadius(radiusMeters);
  }

  public stepSelectedNodeBevel(deltaMeters: number): boolean {
    return this.pathTool.stepSelectedNodeBevel(deltaMeters);
  }

  public toggleSelectedNodeBevel(): boolean {
    return this.pathTool.toggleSelectedNodeBevel();
  }

  public toggleSelectedNodeCorner(): boolean {
    return this.pathTool.toggleSelectedNodeBevel();
  }

  public snapAllSplineNodesToGrid(): boolean {
    return this.pathTool.snapAllNodesToGrid();
  }

  public insertSplineWaypointAt(worldPoint: THREE.Vector3, bypassGrid: boolean = false): boolean {
    return this.pathTool.insertWaypointAt(worldPoint, bypassGrid);
  }

  public deleteSelectedSplineNode(): boolean {
    return this.pathTool.deleteSelectedNode();
  }

  public getPropRotationY(): number {
    return this.propTool.getPropRotationY();
  }

  public refreshOpenSockets(): void {
    const tiles = this.courseManager.getAllTiles?.() ?? [];
    this.socketOverlay.refresh(tiles);
    this.gapOverlay.refresh(tiles);
  }

  private getSurfaceHitPoint(clientX: number, clientY: number): THREE.Vector3 | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    const tiles = this.courseManager.getAllTiles?.() ?? [];
    const tileGroups = tiles.map((t) => t.group);
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

  private resolvePropRole(propInstanceId: string): PropRole {
    const inst = this.courseManager.getProp?.(propInstanceId);
    if (!inst) return "decorative";
    const meta = this.assetLoader.getPiece?.(inst.propData.propId)?.metadata;
    if (meta) return getPiecePropRole(meta);
    return getPiecePropRole({ id: inst.propData.propId, tags: [inst.propData.propId] });
  }

  private extractPropInstanceId(object: THREE.Object3D): string | null {
    let obj: THREE.Object3D | null = object;
    while (obj && !obj.userData?.propInstanceId) {
      obj = obj.parent;
    }
    return obj?.userData?.propInstanceId || null;
  }

  private findHitTile(): { id: string; distance: number } | null {
    const tiles = this.courseManager.getAllTiles?.() ?? [];
    const targets: THREE.Object3D[] = tiles.map((t) => t.group);
    targets.push(...this.gapOverlay.getPickables());
    if (targets.length === 0) return null;
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length === 0) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj && !obj.userData?.tileInstanceId) {
      obj = obj.parent;
    }
    const id = obj?.userData?.tileInstanceId;
    return id ? { id, distance: hits[0].distance } : null;
  }

  /**
   * Resolves raycast priority between track tiles and props so overlapping scenery
   * (arches, tents, knolls, rocks) never steals clicks meant for track tiles,
   * while closer playable props (bumpers, boosters) remain clickable above track surfaces.
   */
  private pickInteractiveTarget(): { kind: "prop" | "tile"; id: string } | null {
    const propGroups = this.courseManager.getAllProps?.().map((p) => p.group) || [];
    const propHits = propGroups.length > 0 ? this.raycaster.intersectObjects(propGroups, true) : [];
    const tileHit = this.findHitTile();

    let firstAnyProp: { id: string; distance: number } | null = null;
    let firstPlayableProp: { id: string; distance: number } | null = null;

    for (const hit of propHits) {
      const id = this.extractPropInstanceId(hit.object);
      if (!id) continue;
      if (!firstAnyProp) {
        firstAnyProp = { id, distance: hit.distance };
      }
      if (!firstPlayableProp && this.resolvePropRole(id) === "playable") {
        firstPlayableProp = { id, distance: hit.distance };
        break;
      }
    }

    if (firstPlayableProp && (!tileHit || firstPlayableProp.distance <= tileHit.distance + 0.05)) {
      return { kind: "prop", id: firstPlayableProp.id };
    }
    if (tileHit) {
      return { kind: "tile", id: tileHit.id };
    }
    if (firstAnyProp) {
      return { kind: "prop", id: firstAnyProp.id };
    }
    return null;
  }

  public getTileClickInfo(tileInstanceId: string): TileClickInfo | null {
    return this.tileCommands.getTileClickInfo(tileInstanceId);
  }

  private handlePointerMove = (ev: PointerEvent): void => {
    if (!this.enabled) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // 00. Spline Track Edit Mode hover & live drag
    if (this.pathTool.isActive()) {
      this.canvas.style.cursor = this.pathTool.handlePointerMove(
        this.raycaster,
        (planeY) => this.getPointOnPlane(ev.clientX, ev.clientY, planeY),
        ev.shiftKey || ev.altKey
      );
      return;
    }

    // 0. Dragging or ghost preview for props
    if (this.propTool.isDragging() || this.propTool.getSelectedPropId()) {
      const pt = this.getSurfaceHitPoint(ev.clientX, ev.clientY);
      const res = this.propTool.updateHoverAndDrag(pt);
      if (res.handled) {
        if (res.cursor) this.canvas.style.cursor = res.cursor;
        return;
      }
    }

    // 2. Erase mode cursor feedback
    if (this.eraseMode) {
      const hitProp = this.findHitPropId();
      const hitTile = !hitProp ? this.findHitTileId() : null;
      this.canvas.style.cursor = hitProp || hitTile ? "pointer" : "crosshair";
      return;
    }

    // 3. Socket gizmo raycast
    const hoveredSocket = this.socketOverlay.updateHover(this.raycaster);
    if (hoveredSocket) {
      this.canvas.style.cursor = "pointer";
      return;
    }
    this.canvas.style.cursor = "default";

    // 4. Prop or track tile / gap hover cursor feedback
    const hoverTarget = this.pickInteractiveTarget();
    this.canvas.style.cursor = hoverTarget ? "pointer" : "default";
  };

  private handlePointerDown = (ev: PointerEvent): void => {
    if (!this.enabled) return;
    if (ev.button !== 0) return; // Left click only (right/middle reserved for camera orbit)

    const rect = this.canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // -1. Spline Track Edit Mode click / begin drag
    if (this.pathTool.isActive()) {
      this.pathTool.handlePointerDown(this.raycaster);
      return;
    }

    // 0. Erase mode
    if (this.eraseMode) {
      const target = this.pickInteractiveTarget();
      if (target?.kind === "prop") {
        this.deleteProp(target.id);
      } else if (target?.kind === "tile") {
        this.deleteTile(target.id);
      }
      return;
    }

    // 1. Prop placement mode
    const activeBrushId = this.propTool.getSelectedPropId();
    if (activeBrushId) {
      const hitPoint = this.getSurfaceHitPoint(ev.clientX, ev.clientY);
      if (hitPoint) {
        this.propTool.placePropAtPoint(activeBrushId, hitPoint);
      }
      return;
    }

    // 2. Socket click
    if (this.socketOverlay.hoveredSocket) {
      this.selectPlacedProp(null);
      this.onSocketClick?.(this.socketOverlay.hoveredSocket, ev.clientX, ev.clientY);
      return;
    }

    // 3. Pick playable prop, track tile (priority over overlapping scenery), or freeform scenery prop
    const target = this.pickInteractiveTarget();
    if (target?.kind === "prop") {
      this.selectPlacedProp(target.id);
      this.propTool.beginDrag(target.id);
      return;
    }
    if (target?.kind === "tile") {
      this.selectPlacedProp(null);
      const info = this.getTileClickInfo(target.id);
      if (info) {
        this.onTileClick?.(info, ev.clientX, ev.clientY);
      }
      return;
    }

    // 4. Clicking empty space clears prop selection
    this.selectPlacedProp(null);
  };

  private handleDoubleClick = (ev: MouseEvent): void => {
    if (!this.enabled || !this.pathTool.isActive()) return;
    this.pathTool.handleDoubleClick(
      (planeY) => this.getPointOnPlane(ev.clientX, ev.clientY, planeY),
      ev.shiftKey || ev.altKey
    );
  };

  private handlePointerUp = (): void => {
    if (!this.enabled) {
      this.pathTool.cancelDrag();
      this.propTool.cancelDrag();
      return;
    }
    if (this.pathTool.isDragging()) {
      this.canvas.style.cursor = "default";
      this.pathTool.finishDrag();
      return;
    }

    if (this.propTool.isDragging()) {
      this.canvas.style.cursor = "default";
      this.propTool.finishDrag();
    }
  };

  public rotatePlacedProp(instanceId: string, deltaDeg: number): void {
    this.propTool.rotatePlacedProp(instanceId, deltaDeg);
  }

  public placePropAtPoint(propId: string, point: THREE.Vector3): void {
    this.propTool.placePropAtPoint(propId, point);
  }

  public deleteProp(propInstanceId: string): void {
    this.propTool.deleteProp(propInstanceId);
  }

  public deleteTile(tileInstanceId: string): boolean {
    return this.tileCommands.deleteTile(tileInstanceId);
  }

  public toggleTileWall(tileInstanceId: string, side: "left" | "right"): boolean {
    return this.tileCommands.toggleTileWall(tileInstanceId, side);
  }

  public toggleTileGap(tileInstanceId: string): boolean {
    return this.tileCommands.toggleTileGap(tileInstanceId);
  }

  public swapTileType(
    tileInstanceId: string,
    newKitPieceId: string,
    options?: { reverseDirection?: boolean }
  ): boolean {
    return this.tileCommands.swapTileType(tileInstanceId, newKitPieceId, options);
  }

  /** Snaps a new kit piece onto an open socket using exact SocketSolver transforms. */
  public snapPieceToSocket(targetSocket: OpenSocketInfo, newKitPieceId: string): void {
    this.tileCommands.snapPieceToSocket(targetSocket, newKitPieceId);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.socketOverlay.clearHover();
      this.propTool.cancelDrag();
      this.pathTool.cancelDrag();
      this.pathTool.clearGhost();
      this.propTool.hideVisuals();
      this.canvas.style.cursor = "default";
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setGizmosVisible(visible: boolean): void {
    this.setEnabled(visible);
    const showSockets = visible && !this.pathTool.isActive();
    this.socketOverlay.setVisible(showSockets);
    this.gapOverlay.setVisible(showSockets);
    this.pathTool.setOverlayVisible(visible);
    if (!visible) {
      this.propTool.hideVisuals();
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
    this.pathTool.dispose();
    this.socketOverlay.dispose();
    this.gapOverlay.dispose();
    this.propTool.dispose();
    this.history.clear();
  }
}
