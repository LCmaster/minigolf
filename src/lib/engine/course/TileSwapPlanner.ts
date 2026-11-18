/**
 * TileSwapPlanner.ts
 * Pure socket-graph planning for swapping a placed tile to a different kit piece
 * while keeping the upstream/downstream chain connected. Operates on serialized
 * `HoleData` only (no Three.js / Rapier), so it is trivially unit-testable.
 */

import type { HoleData, PlacedTile } from "../types/CourseSchema";
import { walkOrderedTileChain } from "../spline/SplineTrackSync";

const SOCKET_IN = "LOC_Socket_In";
const SOCKET_OUT = "LOC_Socket_Out";

export interface TileSwapOptions {
  /** Mirrors entry/exit sockets (symmetrical left/right turns). */
  reverseDirection?: boolean;
}

interface ChainLink {
  parentId: string;
  parentExitSocketId: string;
  childId: string;
  childEntrySocketId: string;
}

/** Finds the socket id on `connected` whose link points at `linkedTileId`. */
function findSocketLinkedTo(
  connected: Record<string, string> | undefined,
  linkedTileId: string
): string | undefined {
  if (!connected) return undefined;
  for (const [socketId, tileId] of Object.entries(connected)) {
    if (tileId === linkedTileId) return socketId;
  }
  return undefined;
}

/** True when any other tile hangs off `target` (attached to it or linked from its sockets). */
function hasDownstreamTiles(hole: HoleData, target: PlacedTile): boolean {
  return hole.tiles.some(
    (t) =>
      t.instanceId !== target.instanceId &&
      (t.attachedTo?.parentInstanceId === target.instanceId ||
        (target.connectedSockets &&
          Object.values(target.connectedSockets).includes(t.instanceId) &&
          t.instanceId !== target.attachedTo?.parentInstanceId))
  );
}

/** Snapshots the socket pair used by every adjacent link of the downstream chain. */
function buildChainLinks(
  byId: Map<string, PlacedTile>,
  targetId: string,
  downstreamIds: string[],
  targetExitSocketId: string
): ChainLink[] {
  if (downstreamIds.length === 0) return [];

  const firstChild = byId.get(downstreamIds[0])!;
  const links: ChainLink[] = [
    {
      parentId: targetId,
      parentExitSocketId: targetExitSocketId,
      childId: firstChild.instanceId,
      childEntrySocketId:
        firstChild.attachedTo?.childSocketId ||
        findSocketLinkedTo(firstChild.connectedSockets, targetId) ||
        SOCKET_IN,
    },
  ];

  // Preserve internal socket directions for subsequent children
  for (let i = 0; i < downstreamIds.length - 1; i++) {
    const parent = byId.get(downstreamIds[i])!;
    const child = byId.get(downstreamIds[i + 1])!;
    links.push({
      parentId: parent.instanceId,
      parentExitSocketId:
        child.attachedTo?.parentSocketId ||
        findSocketLinkedTo(parent.connectedSockets, child.instanceId) ||
        SOCKET_OUT,
      childId: child.instanceId,
      childEntrySocketId:
        child.attachedTo?.childSocketId ||
        findSocketLinkedTo(child.connectedSockets, parent.instanceId) ||
        SOCKET_IN,
    });
  }
  return links;
}

/**
 * Plans swapping `instanceId` to `newKitPieceId`, mutating and returning `hole` with the
 * target re-attached to its parent and every downstream tile re-chained (cached positions
 * cleared so socket snapping recomputes them). Returns `null` when the swap is not allowed:
 * unknown tile, tee/cup type changes, cup swap with downstream tiles, or a single-socket
 * replacement that would orphan downstream tiles.
 */
export function planTileSwap(
  hole: HoleData,
  instanceId: string,
  newKitPieceId: string,
  newSockets: ReadonlyArray<{ id: string }>,
  options?: TileSwapOptions
): HoleData | null {
  const { connectedChain, byId, visited } = walkOrderedTileChain(hole.tiles);
  const target = byId.get(instanceId);
  if (!target) return null;

  const oldLower = target.kitPieceId.toLowerCase();
  const newLower = newKitPieceId.toLowerCase();
  if (oldLower.includes("tee") && !newLower.includes("tee")) return null;
  if (oldLower.includes("cup") && !newLower.includes("cup")) return null;
  if (!oldLower.includes("cup") && newLower.includes("cup") && hasDownstreamTiles(hole, target)) {
    return null;
  }

  const orderedIds = connectedChain.map((t) => t.instanceId);
  const targetOrderIdx = orderedIds.indexOf(instanceId);
  const parentId =
    target.attachedTo?.parentInstanceId ||
    (targetOrderIdx > 0 ? orderedIds[targetOrderIdx - 1] : undefined);
  const parentTile = parentId ? byId.get(parentId) : undefined;
  const downstreamIds = targetOrderIdx >= 0 ? orderedIds.slice(targetOrderIdx + 1) : [];

  // Resolve parent's outgoing socket towards target BEFORE mutating
  const parentOutSocketId =
    target.attachedTo?.parentSocketId ||
    findSocketLinkedTo(parentTile?.connectedSockets, instanceId) ||
    SOCKET_OUT;

  const hasTwoSockets = newSockets.length >= 2;
  const reverse = Boolean(options?.reverseDirection) && hasTwoSockets;
  const defaultInSocketId =
    newSockets.find((s) => s.id === SOCKET_IN)?.id || newSockets[0]?.id || SOCKET_IN;
  const newEntrySocketId = reverse ? SOCKET_OUT : defaultInSocketId;
  const newExitSocketId = hasTwoSockets ? (reverse ? SOCKET_IN : SOCKET_OUT) : null;

  if (downstreamIds.length > 0 && !newExitSocketId) return null;

  const chainLinks = buildChainLinks(
    byId,
    instanceId,
    downstreamIds,
    reverse ? SOCKET_IN : SOCKET_OUT
  );

  // Mutate target tile
  target.kitPieceId = newKitPieceId;
  target.isGap = false;
  target.connectedSockets = {};

  if (parentTile) {
    parentTile.connectedSockets = parentTile.connectedSockets || {};
    parentTile.connectedSockets[parentOutSocketId] = target.instanceId;
    target.attachedTo = {
      parentInstanceId: parentTile.instanceId,
      parentSocketId: parentOutSocketId,
      childSocketId: newEntrySocketId,
    };
    target.connectedSockets[newEntrySocketId] = parentTile.instanceId;
    delete target.position;
    delete target.rotationY;
  }

  if (downstreamIds.length > 0 && newExitSocketId) {
    target.connectedSockets[newExitSocketId] = downstreamIds[0];
  }

  // Rewire and clear cached positions across the downstream chain
  for (const link of chainLinks) {
    const child = byId.get(link.childId);
    if (!child) continue;
    child.attachedTo = {
      parentInstanceId: link.parentId,
      parentSocketId: link.parentExitSocketId,
      childSocketId: link.childEntrySocketId,
    };
    child.connectedSockets = child.connectedSockets || {};
    child.connectedSockets[link.childEntrySocketId] = link.parentId;
    delete child.position;
    delete child.rotationY;
  }

  // Ensure parent-before-child ordering before the hole is reloaded
  const orderedTiles: PlacedTile[] = [];
  for (const id of orderedIds) {
    const tile = byId.get(id);
    if (tile) orderedTiles.push(tile);
  }
  for (const tile of hole.tiles) {
    if (!visited.has(tile.instanceId)) orderedTiles.push(tile);
  }
  hole.tiles = orderedTiles;
  return hole;
}
