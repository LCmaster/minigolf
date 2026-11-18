/**
 * EditorController.ts
 * Manages 3D raycasting, open socket visual gizmos, socket snapping,
 * ghost prop preview, prop selection/move/rotate, and dedicated erase tools.
 */

import * as THREE from "three";
import type { CourseManager } from "../course/CourseManager";
import type { AssetLoader } from "../kitbash/AssetLoader";
import type { PlacedProp, SplinePathData } from "../types/CourseSchema";
import { HistoryManager } from "./HistoryManager";
import { PropEditTool } from "./PropEditTool";
import { type GridSnapSize } from "../spline/PolylineMath";
import { SocketOverlayManager, type OpenSocketInfo } from "./SocketOverlayManager";
import { GapOverlayManager } from "./GapOverlayManager";
import { PathEditTool, type SelectedSplineNodeInfo } from "./PathEditTool";
import { TileEditCommands, type TileClickInfo } from "./TileEditCommands";
import { EditorRaycastPicker } from "./EditorRaycastPicker";
import { EditorInputHandler } from "./EditorInputHandler";

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
  private picker: EditorRaycastPicker;
  private inputHandler: EditorInputHandler;
  private raycaster: THREE.Raycaster;

  public get openSockets(): OpenSocketInfo[] {
    return this.socketOverlay.openSockets;
  }

  private eraseMode: boolean = false;
  private enabled: boolean = true;

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

    this.picker = new EditorRaycastPicker({
      getTiles: () => this.courseManager.getAllTiles?.() ?? [],
      getProps: () => this.courseManager.getAllProps?.() ?? [],
      getGapPickables: () => this.gapOverlay.getPickables(),
      getPropPieceMetadata: (propId) => this.assetLoader.getPiece?.(propId)?.metadata,
    });

    this.inputHandler = new EditorInputHandler({
      canvas: this.canvas,
      camera: this.camera,
      raycaster: this.raycaster,
      isEnabled: () => this.enabled,
      isEraseMode: () => this.eraseMode,
      picker: this.picker,
      socketOverlay: this.socketOverlay,
      propTool: this.propTool,
      pathTool: this.pathTool,
      undo: () => this.undo(),
      redo: () => this.redo(),
      setTrackPathMode: (enabled) => this.setTrackPathMode(enabled),
      setEraseMode: (enabled) => this.setEraseMode(enabled),
      setSelectedProp: (propId) => this.setSelectedProp(propId),
      selectPlacedProp: (id) => this.selectPlacedProp(id),
      deleteSelectedSplineNode: () => this.deleteSelectedSplineNode(),
      deleteTile: (tileId) => this.deleteTile(tileId),
      getTileClickInfo: (tileId) => this.getTileClickInfo(tileId),
      onSocketClick: (info, sx, sy) => this.onSocketClick?.(info, sx, sy),
      onTileClick: (info, sx, sy) => this.onTileClick?.(info, sx, sy),
    });
    this.inputHandler.attach();
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

  public getTileClickInfo(tileInstanceId: string): TileClickInfo | null {
    return this.tileCommands.getTileClickInfo(tileInstanceId);
  }

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
    this.inputHandler.dispose();
    this.pathTool.dispose();
    this.socketOverlay.dispose();
    this.gapOverlay.dispose();
    this.propTool.dispose();
    this.history.clear();
  }
}
