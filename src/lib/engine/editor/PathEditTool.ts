import * as THREE from "three";
import type { CourseManager } from "../course/CourseManager";
import type { AssetLoader } from "../kitbash/AssetLoader";
import type { HoleData, SplinePathData, SplineWaypoint } from "../types/CourseSchema";
import type { EditorCommand, HistoryManager } from "./HistoryManager";
import {
  ELEVATION_STEP_METERS,
  bisectorBevelDragToRadius,
  cloneSplinePath,
  getCornerBevelGeometry,
  getElevationStep,
  snapBevelRadiusToGrid,
  snapCoordinateToGrid,
  type GridSnapSize,
} from "../spline/PolylineMath";
import { deriveSplineFromTiles } from "../spline/SplineTrackSync";
import { fitTilesToSpline } from "../spline/DiscreteKitFitter";
import { SplineOverlay } from "../spline/SplineOverlay";

/** Inspector summary of the currently selected path waypoint and bevel state. */
export interface SelectedSplineNodeInfo {
  index: number;
  nodeCount: number;
  elevationStep: number;
  elevationMeters: number;
  bevelRadius: number;
  maxBevelRadius: number;
  canBevel: boolean;
  corner: boolean;
  isRoot: boolean;
  canDelete: boolean;
  isInvalid: boolean;
  invalidCount: number;
}

export interface PathEditToolDeps {
  scene: THREE.Scene;
  courseManager: CourseManager;
  assetLoader: AssetLoader;
  history: HistoryManager;
  onRefreshOpenSockets: () => void;
  onSplineSelectionChanged?: (info: SelectedSplineNodeInfo | null) => void;
  onCourseModified?: () => void;
}

/**
 * Owns Polyline + Corner Bevel Track Edit Mode state, `SplineOverlay` rendering,
 * waypoint/bevel dragging, grid snapping, and undoable course rebuild commands.
 */
export class PathEditTool {
  private readonly deps: PathEditToolDeps;
  private readonly overlay: SplineOverlay;

  private active: boolean = false;
  private activeTheme: string = "carnival_park";
  private activeSpline: SplinePathData | null = null;
  private selectedNodeIndex: number = 0;
  private invalidNodes: number[] = [];
  private gridSnapSize: GridSnapSize = 1;

  private dragging: {
    kind: "node" | "handle";
    nodeIndex: number;
    initialHole: HoleData;
    workingSpline: SplinePathData;
    planeY: number;
    moved: boolean;
  } | null = null;

  constructor(deps: PathEditToolDeps) {
    this.deps = deps;
    this.overlay = new SplineOverlay(deps.scene);
  }

  public isActive(): boolean {
    return this.active;
  }

  public isDragging(): boolean {
    return this.dragging !== null;
  }

  public setTheme(theme: string): void {
    this.activeTheme = theme;
  }

  public getGridSnapSize(): GridSnapSize {
    return this.gridSnapSize;
  }

  public setGridSnapSize(size: GridSnapSize): void {
    this.gridSnapSize = size;
    if (this.active) this.refreshOverlay();
  }

  public getActiveSpline(): SplinePathData | null {
    return this.activeSpline;
  }

  public setActiveSpline(path: SplinePathData | null): void {
    this.activeSpline = path;
  }

  /** Selects a spline node index (clamped cleanly to the active spline range) and refreshes overlay/UI. */
  public selectSplineNode(index: number): number {
    const count = this.activeSpline?.nodes.length ?? 0;
    this.selectedNodeIndex = count > 0 ? Math.max(0, Math.min(index, count - 1)) : 0;
    if (this.active) {
      this.refreshOverlay();
    } else {
      this.emitSelection();
    }
    return this.selectedNodeIndex;
  }

  public setActive(enabled: boolean): void {
    this.active = enabled;
    if (enabled) {
      this.syncFromCourse();
      if (this.activeSpline && this.activeSpline.nodes.length > 0) {
        this.selectedNodeIndex = this.activeSpline.nodes.length - 1;
      }
      this.overlay.setVisible(true);
      this.refreshOverlay();
    } else {
      this.dragging = null;
      this.overlay.setVisible(false);
      this.deps.onRefreshOpenSockets();
      this.deps.onSplineSelectionChanged?.(null);
    }
  }

  public setOverlayVisible(visible: boolean): void {
    this.overlay.setVisible(visible && this.active);
  }

  public clearGhost(): void {
    this.overlay.clearGhost();
  }

  public cancelDrag(): void {
    this.dragging = null;
  }

  public syncFromCourse(): SplinePathData | null {
    if (typeof this.deps.courseManager.exportHoleData !== "function") return null;
    const stored = this.deps.courseManager.getSplinePath?.() || null;
    const tiles = this.deps.courseManager.exportHoleData().tiles;
    const synced =
      stored && stored.nodes.length >= 2
        ? cloneSplinePath(stored)
        : deriveSplineFromTiles(tiles, this.deps.assetLoader);
    this.deps.courseManager.setSplinePath?.(synced);
    this.activeSpline = synced;
    this.invalidNodes =
      synced.nodes.length >= 2 && typeof this.deps.assetLoader?.getPiece === "function"
        ? fitTilesToSpline(synced, tiles, this.activeTheme, this.deps.assetLoader).invalidNodeIndices
        : [];
    if (synced.nodes.length > 0) {
      this.selectedNodeIndex = Math.max(
        0,
        Math.min(this.selectedNodeIndex, synced.nodes.length - 1)
      );
    }
    if (this.active) {
      this.refreshOverlay();
    }
    return this.activeSpline;
  }

  public getSelectedNodeInfo(): SelectedSplineNodeInfo | null {
    if (!this.active || !this.activeSpline || this.activeSpline.nodes.length === 0) {
      return null;
    }
    const nodes = this.activeSpline.nodes;
    const idx = Math.max(0, Math.min(this.selectedNodeIndex, nodes.length - 1));
    const node = nodes[idx];
    const step = getElevationStep(node);
    const isIntermediate = idx > 0 && idx < nodes.length - 1;
    let bevelRadius = 0;
    let maxBevelRadius = 0;
    let canBevel = false;

    if (isIntermediate) {
      const geom = getCornerBevelGeometry(
        nodes[idx - 1].position,
        node.position,
        nodes[idx + 1].position,
        node.corner ? 0 : node.bevelRadius ?? 0
      );
      canBevel = geom.isValidCorner && geom.maxRadius > 0.2;
      bevelRadius = geom.effectiveRadius;
      maxBevelRadius = geom.maxRadius;
    }

    return {
      index: idx,
      nodeCount: nodes.length,
      elevationStep: step,
      elevationMeters: step * ELEVATION_STEP_METERS,
      bevelRadius,
      maxBevelRadius,
      canBevel,
      corner: bevelRadius <= 0.15,
      isRoot: idx === 0,
      canDelete: idx > 0 && nodes.length > 2,
      isInvalid: this.invalidNodes.includes(idx),
      invalidCount: this.invalidNodes.length,
    };
  }

  public refreshOverlay(isDragging: boolean = false): void {
    if (!this.active || !this.activeSpline) return;
    this.overlay.renderOverlay(
      this.activeSpline.nodes,
      this.selectedNodeIndex,
      isDragging,
      this.gridSnapSize,
      this.invalidNodes
    );
    this.emitSelection();
  }

  public stepSelectedNodeElevation(deltaStep: 1 | -1): boolean {
    if (!this.active) return false;
    const spline = this.activeSpline || this.syncFromCourse();
    if (!spline || spline.nodes.length === 0) return false;

    const idx = Math.max(0, Math.min(this.selectedNodeIndex, spline.nodes.length - 1));
    const oldHole = this.deps.courseManager.exportHoleData(3, 1);
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

  public setSelectedNodeBevelRadius(radiusMeters: number): boolean {
    if (!this.active) return false;
    const spline = this.activeSpline || this.syncFromCourse();
    if (!spline || spline.nodes.length < 3) return false;

    const idx = Math.max(0, Math.min(this.selectedNodeIndex, spline.nodes.length - 1));
    if (idx === 0 || idx === spline.nodes.length - 1) return false;

    const oldHole = this.deps.courseManager.exportHoleData(3, 1);
    oldHole.splinePath = cloneSplinePath(spline);

    const draft = cloneSplinePath(spline);
    const geom = getCornerBevelGeometry(
      draft.nodes[idx - 1].position,
      draft.nodes[idx].position,
      draft.nodes[idx + 1].position,
      radiusMeters
    );
    draft.nodes[idx].bevelRadius = geom.effectiveRadius;
    draft.nodes[idx].corner = false;
    this.commitSplineEdit(
      geom.isBeveled ? `Bevel corner (${geom.effectiveRadius.toFixed(1)}m)` : "Make corner sharp",
      oldHole,
      draft,
      idx
    );
    return true;
  }

  public stepSelectedNodeBevel(deltaMeters: number): boolean {
    const info = this.getSelectedNodeInfo();
    if (!info || !info.canBevel) return false;
    return this.setSelectedNodeBevelRadius(Math.max(0, info.bevelRadius + deltaMeters));
  }

  public toggleSelectedNodeBevel(): boolean {
    const info = this.getSelectedNodeInfo();
    if (!info || !info.canBevel) return false;
    const target = info.bevelRadius > 0.15 ? 0 : Math.min(6.0, info.maxBevelRadius);
    return this.setSelectedNodeBevelRadius(target);
  }

  public snapAllNodesToGrid(): boolean {
    if (!this.active || this.gridSnapSize <= 0) return false;
    const spline = this.activeSpline || this.syncFromCourse();
    if (!spline || spline.nodes.length === 0) return false;

    const oldHole = this.deps.courseManager.exportHoleData(3, 1);
    oldHole.splinePath = cloneSplinePath(spline);

    const draft = cloneSplinePath(spline);
    for (const node of draft.nodes) {
      node.position[0] = snapCoordinateToGrid(node.position[0], this.gridSnapSize);
      node.position[2] = snapCoordinateToGrid(node.position[2], this.gridSnapSize);
      if (typeof node.bevelRadius === "number" && node.bevelRadius > 0) {
        node.bevelRadius = snapBevelRadiusToGrid(node.bevelRadius, this.gridSnapSize);
      }
    }
    this.commitSplineEdit(`Snap path points (${this.gridSnapSize}m grid)`, oldHole, draft);
    return true;
  }

  public insertWaypointAt(worldPoint: THREE.Vector3, bypassGrid: boolean = false): boolean {
    if (!this.active) return false;
    const spline = this.activeSpline || this.syncFromCourse();
    if (!spline || spline.nodes.length === 0) return false;

    const targetX =
      !bypassGrid && this.gridSnapSize > 0
        ? snapCoordinateToGrid(worldPoint.x, this.gridSnapSize)
        : worldPoint.x;
    const targetZ =
      !bypassGrid && this.gridSnapSize > 0
        ? snapCoordinateToGrid(worldPoint.z, this.gridSnapSize)
        : worldPoint.z;

    const oldHole = this.deps.courseManager.exportHoleData(3, 1);
    oldHole.splinePath = cloneSplinePath(spline);

    const draft = cloneSplinePath(spline);
    const insertAfterIdx = Math.max(0, Math.min(this.selectedNodeIndex, draft.nodes.length - 1));
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
      const dir = new THREE.Vector2(targetX - anchor.position[0], targetZ - anchor.position[2]);
      if (dir.lengthSq() > 1e-4) {
        dir.normalize().multiplyScalar(2.4);
        handleX = dir.x;
        handleZ = dir.y;
        anchor.handleOffset = [handleX, handleZ];
      }
    }

    const newNode: SplineWaypoint = {
      id: `wp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      position: [targetX, anchorY, targetZ],
      handleOffset: [handleX, handleZ],
      bevelRadius: 0,
      corner: false,
      elevationStep: step,
    };

    const newIdx = insertAfterIdx + 1;
    draft.nodes.splice(newIdx, 0, newNode);
    this.commitSplineEdit("Insert spline waypoint", oldHole, draft, newIdx);
    return true;
  }

  public deleteSelectedNode(): boolean {
    if (!this.active) return false;
    const spline = this.activeSpline || this.syncFromCourse();
    if (!spline || spline.nodes.length <= 2) return false;

    const idx = Math.max(0, Math.min(this.selectedNodeIndex, spline.nodes.length - 1));
    if (idx === 0) return false; // Root Tee protected from Delete

    const oldHole = this.deps.courseManager.exportHoleData(3, 1);
    oldHole.splinePath = cloneSplinePath(spline);

    const draft = cloneSplinePath(spline);
    draft.nodes.splice(idx, 1);
    const nextIdx = Math.max(0, Math.min(idx - 1, draft.nodes.length - 1));
    this.commitSplineEdit("Delete spline waypoint", oldHole, draft, nextIdx);
    return true;
  }

  /** Updates waypoint/bevel drag live at 60fps or returns hover cursor cue when in Track Edit Mode. */
  public handlePointerMove(
    raycaster: THREE.Raycaster,
    getPointOnPlane: (planeY: number) => THREE.Vector3 | null,
    bypassGrid: boolean
  ): string {
    if (this.dragging) {
      const pt = getPointOnPlane(this.dragging.planeY);
      if (pt) {
        const node = this.dragging.workingSpline.nodes[this.dragging.nodeIndex];
        const snapActive = this.gridSnapSize > 0 && !bypassGrid;
        if (this.dragging.kind === "node") {
          node.position[0] = snapActive ? snapCoordinateToGrid(pt.x, this.gridSnapSize) : pt.x;
          node.position[2] = snapActive ? snapCoordinateToGrid(pt.z, this.gridSnapSize) : pt.z;
        } else {
          const nodes = this.dragging.workingSpline.nodes;
          const idx = this.dragging.nodeIndex;
          if (idx > 0 && idx < nodes.length - 1) {
            const rawRadius = bisectorBevelDragToRadius(
              nodes[idx - 1].position,
              node.position,
              nodes[idx + 1].position,
              [pt.x, pt.z]
            );
            node.bevelRadius = snapActive
              ? snapBevelRadiusToGrid(rawRadius, this.gridSnapSize)
              : rawRadius;
            node.corner = false;
          }
        }
        this.dragging.moved = true;
        this.activeSpline = this.dragging.workingSpline;
        const preview = fitTilesToSpline(
          this.dragging.workingSpline,
          this.dragging.initialHole.tiles,
          this.activeTheme,
          this.deps.assetLoader
        );
        this.invalidNodes = preview.invalidNodeIndices;
        this.refreshOverlay(true);
        this.overlay.renderGhostSegments(preview.ghostSegments, this.deps.assetLoader);
        return "grabbing";
      }
      return "crosshair";
    }

    const handleHits = raycaster.intersectObjects(this.overlay.handleMeshes);
    const nodeHits = raycaster.intersectObjects(this.overlay.nodeMeshes);
    return handleHits.length > 0 || nodeHits.length > 0 ? "grab" : "crosshair";
  }

  /** Selects or starts dragging a spline bevel handle or waypoint sphere on left pointer down. */
  public handlePointerDown(raycaster: THREE.Raycaster): boolean {
    const spline = this.activeSpline || this.syncFromCourse();
    if (!spline) return false;

    const handleHits = raycaster.intersectObjects(this.overlay.handleMeshes);
    if (handleHits.length > 0) {
      const idx = handleHits[0].object.userData.splineHandleIndex as number;
      if (idx > 0 && idx < spline.nodes.length - 1) {
        this.selectedNodeIndex = idx;
        const oldHole = this.deps.courseManager.exportHoleData(3, 1);
        oldHole.splinePath = cloneSplinePath(spline);
        this.dragging = {
          kind: "handle",
          nodeIndex: idx,
          initialHole: oldHole,
          workingSpline: cloneSplinePath(spline),
          planeY: spline.nodes[idx].position[1] + 0.68,
          moved: false,
        };
        this.refreshOverlay();
        return true;
      }
    }

    const nodeHits = raycaster.intersectObjects(this.overlay.nodeMeshes);
    if (nodeHits.length > 0) {
      const idx = nodeHits[0].object.userData.splineNodeIndex as number;
      this.selectedNodeIndex = idx;
      const oldHole = this.deps.courseManager.exportHoleData(3, 1);
      oldHole.splinePath = cloneSplinePath(spline);
      this.dragging = {
        kind: "node",
        nodeIndex: idx,
        initialHole: oldHole,
        workingSpline: cloneSplinePath(spline),
        planeY: spline.nodes[idx].position[1] + 0.68,
        moved: false,
      };
      this.refreshOverlay();
      return true;
    }

    return false;
  }

  public finishDrag(): boolean {
    if (!this.dragging) return false;
    const drag = this.dragging;
    this.dragging = null;
    this.overlay.clearGhost();

    if (drag.moved) {
      this.commitSplineEdit(
        drag.kind === "node" ? "Move spline node" : "Adjust spline curve handle",
        drag.initialHole,
        drag.workingSpline,
        drag.nodeIndex
      );
      return true;
    }

    this.refreshOverlay(false);
    return false;
  }

  public handleDoubleClick(
    getPointOnPlane: (planeY: number) => THREE.Vector3 | null,
    bypassGrid: boolean
  ): boolean {
    const spline = this.activeSpline || this.syncFromCourse();
    if (!spline || spline.nodes.length === 0) return false;
    const idx = Math.max(0, Math.min(this.selectedNodeIndex, spline.nodes.length - 1));
    const pt = getPointOnPlane(spline.nodes[idx].position[1]);
    if (!pt) return false;
    return this.insertWaypointAt(pt, bypassGrid);
  }

  public dispose(): void {
    this.overlay.dispose();
  }

  private emitSelection(): void {
    this.deps.onSplineSelectionChanged?.(this.getSelectedNodeInfo());
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
      this.deps.assetLoader
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
        : Math.max(0, Math.min(this.selectedNodeIndex, nextSpline.nodes.length - 1));
    const prevSelect = this.selectedNodeIndex;
    const prevInvalid = this.invalidNodes;
    const nextInvalid = fit.invalidNodeIndices;

    const cmd: EditorCommand = {
      name: commandName,
      execute: () => {
        this.deps.courseManager.loadHole(newHole);
        this.activeSpline = cloneSplinePath(nextSpline);
        this.invalidNodes = [...nextInvalid];
        this.selectedNodeIndex = targetSelect;
        this.deps.onRefreshOpenSockets();
        this.refreshOverlay();
      },
      undo: () => {
        this.deps.courseManager.loadHole(oldHole);
        this.activeSpline = oldHole.splinePath
          ? cloneSplinePath(oldHole.splinePath)
          : deriveSplineFromTiles(oldHole.tiles, this.deps.assetLoader);
        this.invalidNodes = [...prevInvalid];
        this.selectedNodeIndex = Math.max(
          0,
          Math.min(prevSelect, this.activeSpline.nodes.length - 1)
        );
        this.deps.onRefreshOpenSockets();
        this.refreshOverlay();
      },
    };

    this.deps.history.execute(cmd);
    this.deps.onCourseModified?.();
  }
}
