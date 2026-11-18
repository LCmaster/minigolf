/**
 * TileSocketGraph.ts
 * Pure helpers for the typed socket-link graph stored in `PlacedTile.connectedSockets`
 * (socketId -> target tile instanceId) across a set of placed tiles.
 */

import type { PlacedTile } from "../types/CourseSchema";

/** Any tile registry keyed by instance id whose entries expose serialized tile data. */
export type TileDataMap = ReadonlyMap<string, { tileData: PlacedTile }>;

export interface SocketLink {
  tileId: string;
  socketId: string;
}

/** Connects `socketId` on `tileId` to `targetTileId`. */
export function connectSocket(
  tiles: TileDataMap,
  tileId: string,
  socketId: string,
  targetTileId: string
): boolean {
  const tile = tiles.get(tileId);
  if (!tile) return false;
  tile.tileData.connectedSockets = tile.tileData.connectedSockets || {};
  tile.tileData.connectedSockets[socketId] = targetTileId;
  return true;
}

/** Disconnects `socketId` on `tileId` if currently connected. */
export function disconnectSocket(tiles: TileDataMap, tileId: string, socketId: string): boolean {
  const connected = tiles.get(tileId)?.tileData.connectedSockets;
  if (!connected || !(socketId in connected)) return false;
  delete connected[socketId];
  return true;
}

/** Returns every tile socket that currently links to `tileId`. */
export function findIncomingLinks(tiles: TileDataMap, tileId: string): SocketLink[] {
  const links: SocketLink[] = [];
  for (const [otherId, other] of tiles.entries()) {
    for (const [socketId, targetId] of Object.entries(other.tileData.connectedSockets ?? {})) {
      if (targetId === tileId) links.push({ tileId: otherId, socketId });
    }
  }
  return links;
}

/** Deletes every link that targets `tileId` (used when a tile is removed). */
export function removeLinksTo(tiles: TileDataMap, tileId: string): void {
  for (const { tileId: ownerId, socketId } of findIncomingLinks(tiles, tileId)) {
    delete tiles.get(ownerId)!.tileData.connectedSockets![socketId];
  }
}
