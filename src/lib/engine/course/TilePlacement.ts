/**
 * TilePlacement.ts
 * Pure placement math for track tiles: socket snapping onto a parent tile and the
 * initial aim heading of a Tee tile.
 */

import * as THREE from "three";
import type { PlacedTile } from "../types/CourseSchema";
import type { SocketDefinition } from "../types/KitTypes";
import { SocketSolver } from "./SocketSolver";

/** Minimal view of an already-placed parent tile needed for snapping. */
export interface SnapParent {
  group: THREE.Object3D;
  sockets: SocketDefinition[];
}

/**
 * Resolves `tile.attachedTo` by writing the snapped world `position` / `rotationY` (degrees)
 * into the tile data. No-op when the link, parent, or either socket cannot be resolved.
 */
export function snapTileToParent(
  tile: PlacedTile,
  parent: SnapParent | undefined,
  childSockets: SocketDefinition[]
): void {
  const link = tile.attachedTo;
  if (!link || !parent) return;

  parent.group.updateMatrixWorld(true);
  const parentSocket = parent.sockets.find((s) => s.id === link.parentSocketId);
  const childSocketId = link.childSocketId || "LOC_Socket_In";
  const childSocket = childSockets.find((s) => s.id === childSocketId);
  if (!parentSocket || !childSocket) return;

  const snapped = SocketSolver.computeSnappedTransform(
    parent.group.matrixWorld,
    parentSocket,
    childSocket
  );
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  snapped.decompose(pos, quat, new THREE.Vector3());
  const euler = new THREE.Euler().setFromQuaternion(quat, "YXZ");

  tile.position = [pos.x, pos.y, pos.z];
  tile.rotationY = (euler.y * 180) / Math.PI;
}

/**
 * Horizontal unit heading a Tee tile points the ball along: from the spawn position toward the
 * tile's exit socket, falling back to the group's forward (-Z) axis.
 */
export function computeTeeHeading(
  group: THREE.Object3D,
  sockets: SocketDefinition[],
  spawnPosition: THREE.Vector3
): THREE.Vector3 {
  const exit = sockets.find((s) => s.id === "LOC_Socket_Out");
  if (exit) {
    const exitWorld = new THREE.Vector3(...exit.position).applyMatrix4(group.matrixWorld);
    const toExit = new THREE.Vector3(exitWorld.x - spawnPosition.x, 0, exitWorld.z - spawnPosition.z);
    if (toExit.lengthSq() > 0.0001) return toExit.normalize();
  }
  const forward = new THREE.Vector3(0, 0, -1).applyEuler(group.rotation);
  return new THREE.Vector3(forward.x, 0, forward.z).normalize();
}
