import * as THREE from "three";
import type { CourseManager } from "../course/CourseManager";
import type { AssetLoader } from "../kitbash/AssetLoader";
import type { PlacedProp } from "../types/CourseSchema";
import { getPiecePropRole } from "../types/KitTypes";
import type { EditorCommand, HistoryManager } from "./HistoryManager";

export interface PropEditToolDeps {
  scene: THREE.Scene;
  courseManager: CourseManager;
  assetLoader: AssetLoader;
  history: HistoryManager;
  onToolStateChanged?: () => void;
  onCourseModified?: () => void;
  onPropPlaced?: (propData: PlacedProp) => void;
}

/**
 * Owns freeform prop brush selection, role-tinted ghost placement previews (`Editor_PropGhost`),
 * selection ring (`Editor_SelectionRing`), and undoable drag/rotate/place/delete prop commands.
 */
export class PropEditTool {
  private readonly deps: PropEditToolDeps;
  private readonly ghostGroup: THREE.Group;
  private readonly selectionRing: THREE.Mesh;

  private selectedPropId: string | null = null;
  private selectedPlacedPropId: string | null = null;
  private propRotationY: number = 0;
  private draggingProp: {
    instanceId: string;
    startPos: [number, number, number];
    startRot: [number, number, number];
    moved: boolean;
  } | null = null;

  constructor(deps: PropEditToolDeps) {
    this.deps = deps;

    this.ghostGroup = new THREE.Group();
    this.ghostGroup.name = "Editor_PropGhost";
    this.ghostGroup.visible = false;
    this.deps.scene.add(this.ghostGroup);

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
    this.deps.scene.add(this.selectionRing);
  }

  public getSelectedPropId(): string | null {
    return this.selectedPropId;
  }

  public getSelectedPlacedPropId(): string | null {
    return this.selectedPlacedPropId;
  }

  public getPropRotationY(): number {
    return this.propRotationY;
  }

  public isDragging(): boolean {
    return this.draggingProp !== null;
  }

  /** Selects a kit prop brush (`null` exits placement mode) and rebuilds its ghost preview. */
  public setSelectedProp(propId: string | null, silent: boolean = false): void {
    this.selectedPropId = propId;
    if (propId) {
      this.selectPlacedProp(null, true);
    }
    this.rebuildGhostPreview();
    if (!silent) this.deps.onToolStateChanged?.();
  }

  /** Selects an existing placed prop instance in the scene and moves the selection ring onto it. */
  public selectPlacedProp(instanceId: string | null, silent: boolean = false): void {
    this.selectedPlacedPropId = instanceId;
    if (!instanceId) {
      this.selectionRing.visible = false;
    } else {
      const prop = this.deps.courseManager.getProp?.(instanceId);
      if (prop) {
        this.selectionRing.position.copy(prop.group.position);
        this.selectionRing.position.y += 0.1;
        this.selectionRing.visible = true;
      } else {
        this.selectionRing.visible = false;
        this.selectedPlacedPropId = null;
      }
    }
    if (!silent) this.deps.onToolStateChanged?.();
  }

  public clearSelectionIfMissing(): void {
    if (this.selectedPlacedPropId && !this.deps.courseManager.getProp?.(this.selectedPlacedPropId)) {
      this.selectPlacedProp(null);
    } else if (this.selectedPlacedPropId) {
      this.selectPlacedProp(this.selectedPlacedPropId);
    }
  }

  /** Rotates the placement ghost brush or the currently selected placed prop (`R`). */
  public rotateBrush(deltaDeg: number = 45): void {
    this.propRotationY = ((this.propRotationY + deltaDeg) % 360 + 360) % 360;
    this.ghostGroup.rotation.y = (this.propRotationY * Math.PI) / 180;
  }

  public beginDrag(instanceId: string): boolean {
    const inst = this.deps.courseManager.getProp?.(instanceId);
    if (!inst) return false;
    this.draggingProp = {
      instanceId,
      startPos: [inst.group.position.x, inst.group.position.y, inst.group.position.z],
      startRot: [...inst.propData.rotation],
      moved: false,
    };
    return true;
  }

  /** Updates active drag or ghost placement cursor in world space; returns `true` if handled. */
  public updateHoverAndDrag(worldPoint: THREE.Vector3 | null): {
    handled: boolean;
    cursor?: string;
  } {
    if (this.draggingProp) {
      const inst = this.deps.courseManager.getProp?.(this.draggingProp.instanceId);
      if (inst && worldPoint) {
        inst.group.position.copy(worldPoint);
        this.selectionRing.position.copy(worldPoint);
        this.selectionRing.position.y += 0.1;
        this.draggingProp.moved = true;
      }
      return { handled: true, cursor: "grabbing" };
    }

    if (this.selectedPropId) {
      if (worldPoint) {
        this.ghostGroup.position.copy(worldPoint);
        this.ghostGroup.visible = true;
      }
      return { handled: true, cursor: "crosshair" };
    }

    return { handled: false };
  }

  /** Finishes a prop drag operation and commits an undoable Move command when moved. */
  public finishDrag(): boolean {
    if (!this.draggingProp) return false;
    const drag = this.draggingProp;
    this.draggingProp = null;
    if (!drag.moved) return false;

    const inst = this.deps.courseManager.getProp?.(drag.instanceId);
    if (!inst) return false;

    const newPos: [number, number, number] = [
      inst.group.position.x,
      inst.group.position.y,
      inst.group.position.z,
    ];
    const rot: [number, number, number] = [...drag.startRot];

    const cmd: EditorCommand = {
      name: "Move prop",
      execute: () => {
        this.deps.courseManager.updatePropTransform?.(drag.instanceId, newPos, rot);
        this.selectPlacedProp(drag.instanceId);
      },
      undo: () => {
        this.deps.courseManager.updatePropTransform?.(drag.instanceId, drag.startPos, drag.startRot);
        this.selectPlacedProp(drag.instanceId);
      },
    };
    this.deps.history.execute(cmd);
    this.deps.onCourseModified?.();
    return true;
  }

  public cancelDrag(): void {
    this.draggingProp = null;
  }

  public hideVisuals(): void {
    this.ghostGroup.visible = false;
    this.selectionRing.visible = false;
  }

  public rotatePlacedProp(instanceId: string, deltaDeg: number): void {
    const inst = this.deps.courseManager.getProp?.(instanceId);
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
        this.deps.courseManager.updatePropTransform?.(instanceId, oldPos, newRot);
        this.selectPlacedProp(instanceId);
      },
      undo: () => {
        this.deps.courseManager.updatePropTransform?.(instanceId, oldPos, oldRot);
        this.selectPlacedProp(instanceId);
      },
    };
    this.deps.history.execute(cmd);
    this.deps.onCourseModified?.();
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
        this.deps.courseManager.addProp(propData);
      },
      undo: () => {
        this.deps.courseManager.removeProp(propData.instanceId);
      },
    };
    this.deps.history.execute(cmd);
    this.deps.onPropPlaced?.(propData);
    this.deps.onCourseModified?.();
  }

  public deleteProp(propInstanceId: string): void {
    const existing = this.deps.courseManager.getProp?.(propInstanceId);
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
        this.deps.courseManager.removeProp(propInstanceId);
      },
      undo: () => {
        this.deps.courseManager.addProp(savedData);
      },
    };
    this.deps.history.execute(cmd);
    this.deps.onCourseModified?.();
  }

  public dispose(): void {
    this.clearGhostChildren();
    this.deps.scene.remove(this.ghostGroup);
    this.selectionRing.geometry.dispose();
    (this.selectionRing.material as THREE.Material).dispose();
    this.deps.scene.remove(this.selectionRing);
  }

  private clearGhostChildren(): void {
    while (this.ghostGroup.children.length > 0) {
      const child = this.ghostGroup.children[0];
      this.ghostGroup.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          (obj.material as THREE.Material).dispose();
        }
      });
    }
  }

  private rebuildGhostPreview(): void {
    this.clearGhostChildren();
    this.ghostGroup.visible = false;

    if (!this.selectedPropId || typeof this.deps.assetLoader?.getPiece !== "function") return;
    const template = this.deps.assetLoader.getPiece(this.selectedPropId);
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
}
