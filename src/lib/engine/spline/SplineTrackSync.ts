/**
 * SplineTrackSync.ts
 * Bidirectional conversion between socket-connected PlacedTile[] chains and SplinePathData.
 */

import * as THREE from "three";
import type { AssetLoader, ParsedKitPiece } from "../kitbash/AssetLoader";
import { SocketSolver } from "../course/SocketSolver";
import type {
  HoleData,
  PlacedTile,
  SplinePathData,
  SplineWaypoint,
} from "../types/CourseSchema";
import { ELEVATION_STEP_METERS, cloneSplinePath } from "./SplineMath";

export interface ResolvedTileTransform {
  tile: PlacedTile;
  template: ParsedKitPiece;
  worldMatrix: THREE.Matrix4;
  position: THREE.Vector3;
  entrySocketId: string;
  exitSocketId: string | null;
  exitPosition: THREE.Vector3;
  exitTangentXZ: THREE.Vector2;
  yawDeg: number;
  elevationStep: number;
}

const DEFAULT_HANDLE_LEN = 2.4;

function isHeroOrHazardTile(tile: PlacedTile, template?: ParsedKitPiece): boolean {
  const id = tile.kitPieceId;
  if (id.startsWith("hazard_") || id.includes("bridge") || id.includes("windmill")) {
    return true;
  }
  const cat = template?.metadata?.category;
  return cat === "obstacles" || cat === "hazards";
}

function getYawDegFromDirXZ(dir: THREE.Vector2): number {
  const norm = dir.clone();
  if (norm.lengthSq() < 1e-8) return 0;
  norm.normalize();
  return (Math.atan2(-norm.x, -norm.y) * 180) / Math.PI;
}

function normalizeAngleDeltaDeg(a: number, b: number): number {
  let d = ((b - a + 180) % 360 + 360) % 360 - 180;
  return Math.abs(d);
}

/**
 * Traverses a tile list along connected sockets starting from the Tee tile (or first tile),
 * returning both the contiguous forward chain and the full ordered list (including leftovers).
 */
export function walkOrderedTileChain(tiles: PlacedTile[]): {
  connectedChain: PlacedTile[];
  orderedTiles: PlacedTile[];
  byId: Map<string, PlacedTile>;
  visited: Set<string>;
} {
  const byId = new Map<string, PlacedTile>();
  for (const t of tiles) byId.set(t.instanceId, t);

  const visited = new Set<string>();
  const connectedChain: PlacedTile[] = [];
  if (tiles.length === 0) {
    return { connectedChain, orderedTiles: [], byId, visited };
  }

  const root = tiles.find((t) => t.kitPieceId.toLowerCase().includes("tee")) || tiles[0];
  let cursor: PlacedTile | undefined = root;
  while (cursor && !visited.has(cursor.instanceId)) {
    visited.add(cursor.instanceId);
    connectedChain.push(cursor);

    let nextTile: PlacedTile | undefined;
    if (cursor.connectedSockets) {
      const candidateOutId = cursor.connectedSockets["LOC_Socket_Out"];
      const candidateInId = cursor.connectedSockets["LOC_Socket_In"];
      if (candidateOutId && !visited.has(candidateOutId) && byId.has(candidateOutId)) {
        nextTile = byId.get(candidateOutId);
      } else if (candidateInId && !visited.has(candidateInId) && byId.has(candidateInId)) {
        nextTile = byId.get(candidateInId);
      } else {
        for (const targetId of Object.values(cursor.connectedSockets)) {
          if (targetId && !visited.has(targetId) && byId.has(targetId)) {
            nextTile = byId.get(targetId);
            break;
          }
        }
      }
    }

    // Fallback to finding child whose attachedTo points to cursor
    if (!nextTile) {
      nextTile = tiles.find(
        (t) => !visited.has(t.instanceId) && t.attachedTo?.parentInstanceId === cursor!.instanceId
      );
    }

    cursor = nextTile;
  }

  const orderedTiles = [...connectedChain];
  for (const t of tiles) {
    if (!visited.has(t.instanceId)) {
      orderedTiles.push(t);
    }
  }

  return { connectedChain, orderedTiles, byId, visited };
}

/**
 * Walks tiles along connected socket chains starting from Tee (or first tile),
 * resolving exact world matrices via SocketSolver when `attachedTo` is present.
 */
export function resolveOrderedTileChain(
  tiles: PlacedTile[],
  assetLoader: AssetLoader
): ResolvedTileTransform[] {
  if (tiles.length === 0) return [];
  const { orderedTiles } = walkOrderedTileChain(tiles);

  const resolvedMap = new Map<string, ResolvedTileTransform>();
  const results: ResolvedTileTransform[] = [];

  for (let i = 0; i < orderedTiles.length; i++) {
    const tile = orderedTiles[i];
    const template = assetLoader.getPiece(tile.kitPieceId);
    if (!template) continue;

    let worldMatrix = new THREE.Matrix4();
    let entrySocketId = tile.attachedTo?.childSocketId || "LOC_Socket_In";

    const parentId =
      tile.attachedTo?.parentInstanceId || (i > 0 ? orderedTiles[i - 1].instanceId : undefined);
    const parentResolved = parentId ? resolvedMap.get(parentId) : undefined;

    if (parentResolved && (tile.attachedTo || !tile.position)) {
      const parentSockId =
        tile.attachedTo?.parentSocketId || parentResolved.exitSocketId || "LOC_Socket_Out";
      const parentSock =
        parentResolved.template.sockets.find((s) => s.id === parentSockId) ||
        parentResolved.template.sockets[0];

      // Determine which socket on child was connected to parent
      if (!tile.attachedTo?.childSocketId && tile.connectedSockets) {
        const matchedEntry = Object.entries(tile.connectedSockets).find(
          ([, targetId]) => targetId === parentResolved.tile.instanceId
        );
        if (matchedEntry) entrySocketId = matchedEntry[0];
      }

      const childSock =
        template.sockets.find((s) => s.id === entrySocketId) || template.sockets[0];

      if (parentSock && childSock) {
        worldMatrix = SocketSolver.computeSnappedTransform(
          parentResolved.worldMatrix,
          parentSock,
          childSock
        );
      }
    } else {
      const pos = new THREE.Vector3(...(tile.position || [0, 0, 0]));
      const quat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, ((tile.rotationY || 0) * Math.PI) / 180, 0, "YXZ")
      );
      worldMatrix.compose(pos, quat, new THREE.Vector3(1, 1, 1));
    }

    const position = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    worldMatrix.decompose(position, worldQuat, new THREE.Vector3());

    // Find the forward-going exit socket (the socket that is NOT entrySocketId, or LOC_Socket_Out)
    let exitSock = template.sockets.find((s) => s.id !== entrySocketId) || null;
    if (i === 0) {
      exitSock =
        template.sockets.find((s) => s.id === "LOC_Socket_Out") || template.sockets[0] || null;
    }

    const exitPosition = position.clone();
    const exitTangentXZ = new THREE.Vector2(0, -1);

    if (exitSock) {
      exitPosition.set(...exitSock.position).applyMatrix4(worldMatrix);
      const norm3 = new THREE.Vector3(...exitSock.normal).applyQuaternion(worldQuat).normalize();
      exitTangentXZ.set(norm3.x, norm3.z);
      if (exitTangentXZ.lengthSq() > 1e-6) exitTangentXZ.normalize();
      else exitTangentXZ.set(0, -1);
    } else {
      const forward3 = new THREE.Vector3(0, 0, -1).applyQuaternion(worldQuat).normalize();
      exitTangentXZ.set(forward3.x, forward3.z).normalize();
    }

    const exitElevationY = exitSock ? exitPosition.y : position.y;
    const item: ResolvedTileTransform = {
      tile,
      template,
      worldMatrix,
      position,
      entrySocketId,
      exitSocketId: exitSock ? exitSock.id : null,
      exitPosition,
      exitTangentXZ,
      yawDeg: getYawDegFromDirXZ(exitTangentXZ),
      elevationStep: Math.round(exitElevationY / ELEVATION_STEP_METERS),
    };

    resolvedMap.set(tile.instanceId, item);
    results.push(item);
  }

  return results;
}

/**
 * Derives an editable single-path SplinePathData from any existing modular track chain.
 */
export function deriveSplineFromTiles(
  holeOrTiles: HoleData | PlacedTile[],
  assetLoader: AssetLoader
): SplinePathData {
  const tiles = Array.isArray(holeOrTiles) ? holeOrTiles : holeOrTiles.tiles;
  const resolved = resolveOrderedTileChain(tiles, assetLoader);

  if (resolved.length === 0) {
    return {
      closed: false,
      nodes: [
        {
          id: "wp_0",
          position: [0, 0, 0],
          handleOffset: [0, -DEFAULT_HANDLE_LEN],
          elevationStep: 0,
        },
      ],
    };
  }

  const first = resolved[0];
  const nodes: SplineWaypoint[] = [
    {
      id: "wp_0",
      position: [first.position.x, first.position.y, first.position.z],
      handleOffset: [
        first.exitTangentXZ.x * DEFAULT_HANDLE_LEN,
        first.exitTangentXZ.y * DEFAULT_HANDLE_LEN,
      ],
      corner: false,
      elevationStep: Math.round(first.position.y / ELEVATION_STEP_METERS),
      realizedTileId: first.tile.instanceId,
    },
  ];

  let lastAnchorYaw = first.yawDeg;
  let lastAnchorStep = Math.round(first.position.y / ELEVATION_STEP_METERS);
  let lastAnchorPos = first.position.clone();

  for (let i = 1; i < resolved.length; i++) {
    const r = resolved[i];
    const isLast = i === resolved.length - 1;
    const isCup = r.tile.kitPieceId.includes("cup");

    if (isLast) {
      const endPos = isCup ? r.position : r.exitPosition;
      const endStep = Math.round(endPos.y / ELEVATION_STEP_METERS);
      const endTan = isCup && i > 0 ? resolved[i - 1].exitTangentXZ : r.exitTangentXZ;

      // Avoid zero-distance duplicate tail if single tile
      const dist = endPos.distanceTo(lastAnchorPos);
      const handleScale = Math.min(DEFAULT_HANDLE_LEN, Math.max(0.8, dist * 0.3));
      nodes.push({
        id: `wp_${nodes.length}`,
        position: [endPos.x, endStep * ELEVATION_STEP_METERS, endPos.z],
        handleOffset: [endTan.x * handleScale, endTan.y * handleScale],
        corner: false,
        elevationStep: endStep,
        realizedTileId: r.tile.instanceId,
      });
      break;
    }

    const yawDelta = normalizeAngleDeltaDeg(lastAnchorYaw, r.yawDeg);
    const stepChanged = r.elevationStep !== lastAnchorStep;
    const heroAnchor = isHeroOrHazardTile(r.tile, r.template);
    const distFromLast = r.exitPosition.distanceTo(lastAnchorPos);

    if ((yawDelta >= 25 || stepChanged || heroAnchor) && distFromLast >= 4.0) {
      const anchorPos = r.exitPosition;
      nodes.push({
        id: `wp_${nodes.length}`,
        position: [
          anchorPos.x,
          r.elevationStep * ELEVATION_STEP_METERS,
          anchorPos.z,
        ],
        handleOffset: [
          r.exitTangentXZ.x * DEFAULT_HANDLE_LEN,
          r.exitTangentXZ.y * DEFAULT_HANDLE_LEN,
        ],
        corner: false,
        elevationStep: r.elevationStep,
        realizedTileId: r.tile.instanceId,
      });
      lastAnchorYaw = r.yawDeg;
      lastAnchorStep = r.elevationStep;
      lastAnchorPos = anchorPos.clone();
    }
  }

  // If single tile (Tee only), add an explicit forward tail node at its exit socket
  if (nodes.length === 1) {
    const tailPos = first.exitPosition;
    const tailStep = Math.round(tailPos.y / ELEVATION_STEP_METERS);
    nodes.push({
      id: "wp_1",
      position: [tailPos.x, tailStep * ELEVATION_STEP_METERS, tailPos.z],
      handleOffset: [
        first.exitTangentXZ.x * 1.5,
        first.exitTangentXZ.y * 1.5,
      ],
      corner: false,
      elevationStep: tailStep,
      realizedTileId: first.tile.instanceId,
    });
  }

  return { closed: false, nodes };
}

/**
 * Synchronizes `splinePath` cleanly when tiles are manually added or erased
 * via socket rings in Build mode.
 */
export function syncSplineAfterSocketChange(
  currentSpline: SplinePathData | null,
  tiles: PlacedTile[],
  assetLoader: AssetLoader
): SplinePathData {
  if (!currentSpline || currentSpline.nodes.length < 2) {
    return deriveSplineFromTiles(tiles, assetLoader);
  }

  const resolved = resolveOrderedTileChain(tiles, assetLoader);
  if (resolved.length === 0) {
    return deriveSplineFromTiles(tiles, assetLoader);
  }

  const last = resolved[resolved.length - 1];
  const isCup = last.tile.kitPieceId.includes("cup");
  const newEndPos = isCup ? last.position : last.exitPosition;
  const newEndStep = Math.round(newEndPos.y / ELEVATION_STEP_METERS);
  const newEndTan =
    isCup && resolved.length > 1
      ? resolved[resolved.length - 2].exitTangentXZ
      : last.exitTangentXZ;

  const updated = cloneSplinePath(currentSpline);
  const nodes = updated.nodes;
  const tail = nodes[nodes.length - 1];
  const prev = nodes[nodes.length - 2];

  const tailDistMoved = Math.hypot(
    newEndPos.x - tail.position[0],
    newEndPos.z - tail.position[2]
  );

  // If user snapped a new piece far past the previous tail (>= 2m) and turned/climbed,
  // or erased past the previous waypoint, re-derive tail cleanly while preserving earlier user edits
  const distToPrev = Math.hypot(
    newEndPos.x - prev.position[0],
    newEndPos.z - prev.position[2]
  );

  if (nodes.length > 2 && distToPrev < 2.5) {
    // User erased back to before the second-to-last waypoint
    return deriveSplineFromTiles(tiles, assetLoader);
  }

  if (tailDistMoved > 7.5 && resolved.length > 2) {
    // Keep old tail as an intermediate waypoint if direction changed or elevation stepped,
    // and append new tail waypoint
    const prevToEnd = new THREE.Vector2(
      newEndPos.x - tail.position[0],
      newEndPos.z - tail.position[2]
    );
    const oldTan = new THREE.Vector2(tail.handleOffset[0], tail.handleOffset[1]);
    if (
      prevToEnd.lengthSq() > 1e-4 &&
      oldTan.lengthSq() > 1e-4 &&
      prevToEnd.clone().normalize().dot(oldTan.clone().normalize()) < 0.94
    ) {
      nodes.push({
        id: `wp_${Date.now() % 100000}`,
        position: [newEndPos.x, newEndStep * ELEVATION_STEP_METERS, newEndPos.z],
        handleOffset: [newEndTan.x * DEFAULT_HANDLE_LEN, newEndTan.y * DEFAULT_HANDLE_LEN],
        corner: false,
        elevationStep: newEndStep,
        realizedTileId: last.tile.instanceId,
      });
      return updated;
    }
  }

  tail.position = [newEndPos.x, newEndStep * ELEVATION_STEP_METERS, newEndPos.z];
  tail.elevationStep = newEndStep;
  tail.handleOffset = [newEndTan.x * DEFAULT_HANDLE_LEN, newEndTan.y * DEFAULT_HANDLE_LEN];
  tail.realizedTileId = last.tile.instanceId;

  return updated;
}

