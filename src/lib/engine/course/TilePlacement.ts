/**
 * TilePlacement.ts
 * Pure placement math for track tiles: socket snapping onto a parent tile and the
 * initial aim heading of a Tee tile.
 */

import * as THREE from "three";
import type { PlacedTile, SplinePathData } from "../types/CourseSchema";
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

/** Horizontal unit direction of the spline's first leg, or `null` when it is missing/degenerate. */
export function splineStartHeading(path: SplinePathData | null): THREE.Vector3 | null {
  if (!path || path.nodes.length < 2) return null;
  const [x0, , z0] = path.nodes[0].position;
  const [x1, , z1] = path.nodes[1].position;
  const dir = new THREE.Vector3(x1 - x0, 0, z1 - z0);
  return dir.lengthSq() > 0.0001 ? dir.normalize() : null;
}

export interface WallMeshes {
  left?: THREE.Object3D;
  right?: THREE.Object3D;
  back?: THREE.Object3D;
}

/**
 * Finds wall submeshes inside a tile group (supports both single Mesh and multi-material Group
 * wrappers) by name, ignoring Blender duplicate suffixes such as `.008` or `001`.
 */
export function findWallMeshes(group: THREE.Object3D): WallMeshes {
  const walls: WallMeshes = {};
  group.traverse((child) => {
    const cleanName = child.name.replace(/(?:\.\d+|\d{3})+$/, "");
    if (cleanName === "Mesh_Wall_L" && !walls.left) walls.left = child;
    if (cleanName === "Mesh_Wall_R" && !walls.right) walls.right = child;
    if ((cleanName === "Mesh_Wall_Back" || cleanName === "Mesh_Wall_B") && !walls.back) {
      walls.back = child;
    }
  });
  return walls;
}

/** Deep copy of serialized tile data (position, walls, socket links, attachment). */
export function clonePlacedTile(tile: PlacedTile): PlacedTile {
  return {
    ...tile,
    position: tile.position ? ([...tile.position] as [number, number, number]) : undefined,
    walls: { ...tile.walls },
    connectedSockets: tile.connectedSockets ? { ...tile.connectedSockets } : undefined,
    attachedTo: tile.attachedTo ? { ...tile.attachedTo } : undefined,
  };
}

/** World position of a named template locator (rotated by the group's Euler, then translated). */
export function locatorWorldPosition(
  group: THREE.Object3D,
  locators: ReadonlyMap<string, THREE.Vector3>,
  name: string
): THREE.Vector3 | null {
  const local = locators.get(name);
  if (!local) return null;
  return local.clone().applyEuler(group.rotation).add(group.position);
}
