/**
 * TileEditCommands.ts
 * Encapsulates undoable track-tile mutations (delete, wall toggle, gap toggle, type swap,
 * socket snapping) and click-info inspection for the level editor.
 */

import * as THREE from "three";
import type { CourseManager } from "../course/CourseManager";
import { SocketSolver } from "../course/SocketSolver";
import { clonePlacedTile } from "../course/TilePlacement";
import type { AssetLoader } from "../kitbash/AssetLoader";
import type { PlacedTile, SplinePathData } from "../types/CourseSchema";
import { resolveOrderedTileChain, syncSplineAfterSocketChange } from "../spline/SplineTrackSync";
import type { HistoryManager, EditorCommand } from "./HistoryManager";
import type { OpenSocketInfo } from "./SocketOverlayManager";

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

export interface TileEditCommandsDeps {
  courseManager: CourseManager;
  assetLoader: AssetLoader;
  history: HistoryManager;
  onSyncSpline: (spline: SplinePathData | null) => void;
  onRefreshOpenSockets: () => void;
  onCourseModified?: () => void;
}

export class TileEditCommands {
  private deps: TileEditCommandsDeps;

  constructor(deps: TileEditCommandsDeps) {
    this.deps = deps;
  }

  /** Builds popover metadata for a clicked tile, including downstream chain presence. */
  public getTileClickInfo(tileInstanceId: string): TileClickInfo | null {
    const { courseManager, assetLoader } = this.deps;
    const instantiated = courseManager.getTile?.(tileInstanceId);
    if (!instantiated) return null;

    const tileData: PlacedTile = instantiated.tileData;
    const idLower = tileData.kitPieceId.toLowerCase();
    const isTee = idLower.includes("tee");
    const isCup = idLower.includes("cup");

    let hasDownstream = false;
    const tiles = courseManager.getAllTiles?.() ?? [];
    const allTiles: PlacedTile[] = tiles.map((t) => t.tileData);
    const chain = resolveOrderedTileChain(allTiles, assetLoader);
    const chainIdx = chain.findIndex((c) => c.tile.instanceId === tileInstanceId);
    if (chainIdx >= 0 && chainIdx < chain.length - 1) {
      hasDownstream = true;
    } else {
      hasDownstream = tiles.some(
        (other) =>
          other.tileData.instanceId !== tileInstanceId &&
          other.tileData.attachedTo?.parentInstanceId === tileInstanceId
      );
    }

    return {
      tileInstanceId,
      kitPieceId: tileData.kitPieceId,
      name:
        instantiated.pieceTemplate?.metadata?.name ||
        (instantiated.pieceTemplate as any)?.name ||
        tileData.kitPieceId,
      walls: { ...tileData.walls },
      hasDynamicWalls: instantiated.pieceTemplate?.metadata?.hasDynamicWalls ?? true,
      isGap: Boolean(tileData.isGap),
      isTee,
      isCup,
      hasDownstream,
    };
  }

  /** Removes a non-root tile and records an undo command restoring incoming links and spline. */
  public deleteTile(tileInstanceId: string): boolean {
    const { courseManager, assetLoader, history, onSyncSpline, onRefreshOpenSockets, onCourseModified } =
      this.deps;
    const allTiles = courseManager.getAllTiles?.() ?? [];
    if (allTiles.length <= 1) return false; // Keep at least root tee tile

    const existing = courseManager.getTile?.(tileInstanceId);
    if (!existing) return false;
    if (existing.tileData.kitPieceId.includes("tee") && allTiles[0]?.tileData.instanceId === tileInstanceId) {
      return false; // Protect starting tee box
    }

    const savedTile = clonePlacedTile(existing.tileData);
    const incomingLinks = courseManager.findIncomingSocketLinks?.(tileInstanceId) ?? [];
    const prevSpline = courseManager.getSplinePath?.() || null;

    const cmd: EditorCommand = {
      name: `Remove ${savedTile.kitPieceId}`,
      execute: () => {
        courseManager.removeTile(tileInstanceId);
        if (typeof courseManager.exportHoleData === "function") {
          const synced = syncSplineAfterSocketChange(
            prevSpline,
            courseManager.exportHoleData().tiles,
            assetLoader
          );
          courseManager.setSplinePath?.(synced);
          onSyncSpline(synced);
        }
        onRefreshOpenSockets();
      },
      undo: () => {
        courseManager.addTile(clonePlacedTile(savedTile), true);
        for (const link of incomingLinks) {
          courseManager.connectTileSocket?.(link.tileId, link.socketId, tileInstanceId);
        }
        courseManager.setSplinePath?.(prevSpline);
        onSyncSpline(prevSpline);
        onRefreshOpenSockets();
      },
    };

    history.execute(cmd);
    onCourseModified?.();
    return true;
  }

  /** Toggles a solid tile's left or right wall via an undoable command. */
  public toggleTileWall(tileInstanceId: string, side: "left" | "right"): boolean {
    const { courseManager, history, onCourseModified } = this.deps;
    const existing = courseManager.getTile?.(tileInstanceId);
    if (!existing || existing.tileData.isGap) return false;

    const cmd: EditorCommand = {
      name: `Toggle ${side} wall`,
      execute: () => {
        courseManager.toggleWall(tileInstanceId, side);
      },
      undo: () => {
        courseManager.toggleWall(tileInstanceId, side);
      },
    };
    history.execute(cmd);
    onCourseModified?.();
    return true;
  }

  /** Toggles a mid-course tile between solid surface and an open jump gap. */
  public toggleTileGap(tileInstanceId: string): boolean {
    const { courseManager, history, onSyncSpline, onRefreshOpenSockets, onCourseModified } = this.deps;
    const existing = courseManager.getTile?.(tileInstanceId);
    if (!existing) return false;

    const idLower = existing.tileData.kitPieceId.toLowerCase();
    if (idLower.includes("tee") || idLower.includes("cup")) return false;

    const prevGap = Boolean(existing.tileData.isGap);
    const nextGap = !prevGap;
    const prevSpline = courseManager.getSplinePath?.() || null;

    const applyGap = (gapValue: boolean) => {
      courseManager.setTileGap(tileInstanceId, gapValue);
      courseManager.setSplinePath?.(prevSpline);
      onSyncSpline(prevSpline);
      onRefreshOpenSockets();
    };

    const cmd: EditorCommand = {
      name: nextGap ? `Remove tile surface (Gap)` : `Restore tile surface`,
      execute: () => applyGap(nextGap),
      undo: () => applyGap(prevGap),
    };
    history.execute(cmd);
    onCourseModified?.();
    return true;
  }

  /** Swaps a tile to another kit piece and records an undoable hole snapshot command. */
  public swapTileType(
    tileInstanceId: string,
    newKitPieceId: string,
    options?: { reverseDirection?: boolean }
  ): boolean {
    const { courseManager, assetLoader, history, onSyncSpline, onRefreshOpenSockets, onCourseModified } =
      this.deps;
    const oldHole = courseManager.exportHoleData?.();
    if (!oldHole) return false;

    const ok = courseManager.swapTileType(tileInstanceId, newKitPieceId, options);
    if (!ok) return false;

    const prevSpline = oldHole.splinePath || null;
    const updatedHole = courseManager.exportHoleData();
    const syncedSpline = syncSplineAfterSocketChange(
      prevSpline,
      updatedHole.tiles,
      assetLoader
    );
    updatedHole.splinePath = syncedSpline;
    courseManager.setSplinePath?.(syncedSpline);
    onSyncSpline(syncedSpline);
    onRefreshOpenSockets();

    let firstRun = true;
    const newTpl = assetLoader.getPiece(newKitPieceId);
    const label = newTpl?.metadata?.name || (newTpl as any)?.name || newKitPieceId;
    const cmd: EditorCommand = {
      name: `Swap tile to ${label}`,
      execute: () => {
        if (firstRun) {
          firstRun = false;
          return;
        }
        courseManager.loadHole(updatedHole);
        onSyncSpline(syncedSpline);
        onRefreshOpenSockets();
      },
      undo: () => {
        courseManager.loadHole(oldHole);
        onSyncSpline(oldHole.splinePath || null);
        onRefreshOpenSockets();
      },
    };
    history.execute(cmd);
    onCourseModified?.();
    return true;
  }

  /** Snaps a new kit piece onto an open socket using exact SocketSolver transforms. */
  public snapPieceToSocket(targetSocket: OpenSocketInfo, newKitPieceId: string): void {
    const { courseManager, assetLoader, history, onSyncSpline, onRefreshOpenSockets, onCourseModified } =
      this.deps;
    const template = assetLoader.getPiece(newKitPieceId);
    if (!template) return;

    const inSocket = template.sockets.find((s) => s.id === "LOC_Socket_In") || template.sockets[0];
    if (!inSocket) return;

    const parentTile = courseManager.getTile?.(targetSocket.tileInstanceId);
    const { newPos, rotationY } = this.computeSnappedPose(targetSocket, parentTile, inSocket);
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

    const prevSpline = courseManager.getSplinePath?.() || null;
    const pieceLabel = template.metadata?.name || (template as any).name || newKitPieceId;
    const cmd: EditorCommand = {
      name: `Add ${pieceLabel}`,
      execute: () => {
        courseManager.addTile(newTileData, true);
        courseManager.connectTileSocket?.(
          targetSocket.tileInstanceId,
          targetSocket.socketId,
          newInstanceId
        );
        const synced = syncSplineAfterSocketChange(
          prevSpline,
          courseManager.exportHoleData?.().tiles || [],
          assetLoader
        );
        courseManager.setSplinePath?.(synced);
        onSyncSpline(synced);
        onRefreshOpenSockets();
      },
      undo: () => {
        courseManager.disconnectTileSocket?.(targetSocket.tileInstanceId, targetSocket.socketId);
        courseManager.removeTile(newInstanceId);
        courseManager.setSplinePath?.(prevSpline);
        onSyncSpline(prevSpline);
        onRefreshOpenSockets();
      },
    };

    history.execute(cmd);
    onCourseModified?.();
  }

  private computeSnappedPose(
    targetSocket: OpenSocketInfo,
    parentTile: any,
    inSocket: any
  ): { newPos: THREE.Vector3; rotationY: number } {
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
        return {
          newPos: pos,
          rotationY: Math.round(((euler.y * 180) / Math.PI) % 360),
        };
      }
      return { newPos: targetSocket.worldPosition.clone(), rotationY: 0 };
    }

    const targetNorm = targetSocket.normal.clone();
    const inNorm = new THREE.Vector3(...inSocket.normal);
    const desiredAngle = Math.atan2(targetNorm.x, targetNorm.z) + Math.PI;
    const inAngle = Math.atan2(inNorm.x, inNorm.z);
    const rotationY = Math.round(((desiredAngle - inAngle) * 180) / Math.PI);

    const rotatedInPos = new THREE.Vector3(...inSocket.position);
    rotatedInPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), (rotationY * Math.PI) / 180);
    return { newPos: targetSocket.worldPosition.clone().sub(rotatedInPos), rotationY };
  }
}

