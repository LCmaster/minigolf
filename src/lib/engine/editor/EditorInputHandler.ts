/**
 * EditorInputHandler.ts
 * Owns DOM pointer and keyboard event routing for the level editor: shortcuts
 * (undo/redo, rotate, mode toggles, delete, escape) and pointer hover/click/drag dispatch.
 */

import * as THREE from "three";
import type { EditorRaycastPicker } from "./EditorRaycastPicker";
import type { PathEditTool } from "./PathEditTool";
import type { PropEditTool } from "./PropEditTool";
import type { OpenSocketInfo, SocketOverlayManager } from "./SocketOverlayManager";
import type { TileClickInfo } from "./TileEditCommands";

export interface EditorInputHandlerDeps {
  canvas: HTMLCanvasElement;
  camera: THREE.Camera;
  raycaster: THREE.Raycaster;
  isEnabled: () => boolean;
  isEraseMode: () => boolean;
  picker: EditorRaycastPicker;
  socketOverlay: SocketOverlayManager;
  propTool: PropEditTool;
  pathTool: PathEditTool;
  undo: () => boolean;
  redo: () => boolean;
  setTrackPathMode: (enabled: boolean) => void;
  setEraseMode: (enabled: boolean) => void;
  setSelectedProp: (propId: string | null) => void;
  selectPlacedProp: (instanceId: string | null) => void;
  deleteSelectedSplineNode: () => boolean;
  deleteTile: (tileInstanceId: string) => boolean;
  getTileClickInfo: (tileInstanceId: string) => TileClickInfo | null;
  onSocketClick: (info: OpenSocketInfo, screenX: number, screenY: number) => void;
  onTileClick: (info: TileClickInfo, screenX: number, screenY: number) => void;
}

export class EditorInputHandler {
  private readonly deps: EditorInputHandlerDeps;

  constructor(deps: EditorInputHandlerDeps) {
    this.deps = deps;
  }

  /** Registers canvas pointer listeners and window keyboard/pointerup listeners. */
  public attach(): void {
    const { canvas } = this.deps;
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("dblclick", this.handleDoubleClick);

    if (typeof window !== "undefined") {
      window.addEventListener("pointerup", this.handlePointerUp);
      window.addEventListener("keydown", this.handleKeyDown);
    }
  }

  /** Unregisters all canvas and window event listeners. */
  public dispose(): void {
    const { canvas } = this.deps;
    canvas.removeEventListener("pointermove", this.handlePointerMove);
    canvas.removeEventListener("pointerdown", this.handlePointerDown);
    canvas.removeEventListener("dblclick", this.handleDoubleClick);

    if (typeof window !== "undefined") {
      window.removeEventListener("pointerup", this.handlePointerUp);
      window.removeEventListener("keydown", this.handleKeyDown);
    }
  }

  /** Routes editor keyboard shortcuts while ignoring text/select form inputs. */
  public handleKeyDown = (ev: KeyboardEvent): void => {
    const d = this.deps;
    if (!d.isEnabled()) return;
    const tag = (ev.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if ((ev.ctrlKey || ev.metaKey) && ev.key === "z") {
      ev.preventDefault();
      if (ev.shiftKey) d.redo();
      else d.undo();
      return;
    }
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "y") {
      ev.preventDefault();
      d.redo();
      return;
    }

    if (ev.key === "r" || ev.key === "R") {
      const placedId = d.propTool.getSelectedPlacedPropId();
      if (placedId && !d.propTool.getSelectedPropId() && !d.isEraseMode()) {
        d.propTool.rotatePlacedProp(placedId, 45);
      } else {
        d.propTool.rotateBrush(45);
      }
    } else if (ev.key === "t" || ev.key === "T") {
      d.setTrackPathMode(!d.pathTool.isActive());
    } else if (ev.key === "x" || ev.key === "X") {
      d.setEraseMode(!d.isEraseMode());
    } else if (ev.key === "Delete" || ev.key === "Backspace") {
      const placedId = d.propTool.getSelectedPlacedPropId();
      if (d.pathTool.isActive()) {
        ev.preventDefault();
        d.deleteSelectedSplineNode();
      } else if (placedId) {
        ev.preventDefault();
        d.propTool.selectPlacedProp(null);
        d.propTool.deleteProp(placedId);
      }
    } else if (ev.key === "Escape") {
      d.setTrackPathMode(false);
      d.setEraseMode(false);
      d.setSelectedProp(null);
      d.selectPlacedProp(null);
    }
  };

  /** Updates cursor feedback, spline/prop live drags, and socket hover state on pointer move. */
  public handlePointerMove = (ev: PointerEvent): void => {
    const d = this.deps;
    if (!d.isEnabled()) return;

    d.picker.setRayFromClient(d.raycaster, d.canvas, d.camera, ev.clientX, ev.clientY);

    if (d.pathTool.isActive()) {
      d.canvas.style.cursor = d.pathTool.handlePointerMove(
        d.raycaster,
        (planeY) => d.picker.getPointOnPlane(d.raycaster, d.canvas, d.camera, ev.clientX, ev.clientY, planeY),
        ev.shiftKey || ev.altKey
      );
      return;
    }

    if (d.propTool.isDragging() || d.propTool.getSelectedPropId()) {
      const pt = d.picker.getSurfaceHitPoint(d.raycaster, d.canvas, d.camera, ev.clientX, ev.clientY);
      const res = d.propTool.updateHoverAndDrag(pt);
      if (res.handled) {
        if (res.cursor) d.canvas.style.cursor = res.cursor;
        return;
      }
    }

    if (d.isEraseMode()) {
      const target = d.picker.pickInteractiveTarget(d.raycaster);
      d.canvas.style.cursor = target ? "pointer" : "crosshair";
      return;
    }

    if (d.socketOverlay.updateHover(d.raycaster)) {
      d.canvas.style.cursor = "pointer";
      return;
    }

    const hoverTarget = d.picker.pickInteractiveTarget(d.raycaster);
    d.canvas.style.cursor = hoverTarget ? "pointer" : "default";
  };

  /** Handles primary-button clicks for spline nodes, erase, prop brush, sockets, and selection. */
  public handlePointerDown = (ev: PointerEvent): void => {
    const d = this.deps;
    if (!d.isEnabled() || ev.button !== 0) return;

    d.picker.setRayFromClient(d.raycaster, d.canvas, d.camera, ev.clientX, ev.clientY);

    if (d.pathTool.isActive()) {
      d.pathTool.handlePointerDown(d.raycaster);
      return;
    }

    if (d.isEraseMode()) {
      const target = d.picker.pickInteractiveTarget(d.raycaster);
      if (target?.kind === "prop") d.propTool.deleteProp(target.id);
      else if (target?.kind === "tile") d.deleteTile(target.id);
      return;
    }

    const activeBrushId = d.propTool.getSelectedPropId();
    if (activeBrushId) {
      const hitPoint = d.picker.getSurfaceHitPoint(d.raycaster, d.canvas, d.camera, ev.clientX, ev.clientY);
      if (hitPoint) d.propTool.placePropAtPoint(activeBrushId, hitPoint);
      return;
    }

    if (d.socketOverlay.hoveredSocket) {
      d.selectPlacedProp(null);
      d.onSocketClick(d.socketOverlay.hoveredSocket, ev.clientX, ev.clientY);
      return;
    }

    const target = d.picker.pickInteractiveTarget(d.raycaster);
    if (target?.kind === "prop") {
      d.selectPlacedProp(target.id);
      d.propTool.beginDrag(target.id);
      return;
    }
    if (target?.kind === "tile") {
      d.selectPlacedProp(null);
      const info = d.getTileClickInfo(target.id);
      if (info) d.onTileClick(info, ev.clientX, ev.clientY);
      return;
    }

    d.selectPlacedProp(null);
  };

  /** Forwards canvas double-clicks to the spline path tool when active. */
  public handleDoubleClick = (ev: MouseEvent): void => {
    const d = this.deps;
    if (!d.isEnabled() || !d.pathTool.isActive()) return;
    d.pathTool.handleDoubleClick(
      (planeY) => d.picker.getPointOnPlane(d.raycaster, d.canvas, d.camera, ev.clientX, ev.clientY, planeY),
      ev.shiftKey || ev.altKey
    );
  };

  /** Completes or cancels active spline/prop drags on pointer release. */
  public handlePointerUp = (): void => {
    const d = this.deps;
    if (!d.isEnabled()) {
      d.pathTool.cancelDrag();
      d.propTool.cancelDrag();
      return;
    }
    if (d.pathTool.isDragging()) {
      d.canvas.style.cursor = "default";
      d.pathTool.finishDrag();
      return;
    }
    if (d.propTool.isDragging()) {
      d.canvas.style.cursor = "default";
      d.propTool.finishDrag();
    }
  };
}
