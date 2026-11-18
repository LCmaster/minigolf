/**
 * InstantiatedTile.ts
 * Runtime record of a placed track tile: its serialized data, kit template, scene group,
 * wall submeshes, and the Rapier/visual handles owned on its behalf.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { ParsedKitPiece } from "../kitbash/AssetLoader";
import type { PlacedTile } from "../types/CourseSchema";
import type { BoosterVisuals } from "./BoosterVisuals";
import type { TileWindmill } from "./TileWindmill";

export interface InstantiatedTile {
  tileData: PlacedTile;
  pieceTemplate: ParsedKitPiece;
  group: THREE.Group;
  wallLMesh?: THREE.Object3D;
  wallRMesh?: THREE.Object3D;
  wallBackMesh?: THREE.Object3D;
  wallLCollider?: RAPIER.Collider;
  wallRCollider?: RAPIER.Collider;
  wallBackCollider?: RAPIER.Collider;
  boosterSensorCollider?: RAPIER.Collider;
  boosterVisuals?: BoosterVisuals;
  windmill?: TileWindmill;
}
