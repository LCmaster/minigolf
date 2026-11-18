/**
 * TileBooster.ts
 * Builds the runtime pieces of a booster hazard tile: its sensor volume, hovering chevron
 * visuals, and the push info the engine applies when the ball enters.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { BoosterVisuals } from "./BoosterVisuals";
import type { BoosterSensorInfo } from "./PropInstanceManager";

/** Impulse magnitude applied to the ball when it triggers a booster. */
export const BOOSTER_IMPULSE = 0.038;

export interface TileBooster {
  collider: RAPIER.Collider;
  visuals: BoosterVisuals;
  info: BoosterSensorInfo;
}

export function createTileBooster(
  rapier: typeof RAPIER,
  rapierWorld: RAPIER.World,
  group: THREE.Group
): TileBooster {
  const desc = rapier.ColliderDesc.cuboid(2.3, 0.25, 1.4)
    .setTranslation(group.position.x, group.position.y + 0.15, group.position.z)
    .setRotation(group.quaternion)
    .setSensor(true)
    .setActiveEvents(rapier.ActiveEvents.COLLISION_EVENTS);
  const collider = rapierWorld.createCollider(desc);

  const visuals = new BoosterVisuals();
  visuals.update(0);
  group.add(visuals.group);

  const info: BoosterSensorInfo = {
    direction: new THREE.Vector3(0, 0, -1).applyQuaternion(group.quaternion).normalize(),
    impulse: BOOSTER_IMPULSE,
    center: group.position.clone(),
    visuals,
  };
  return { collider, visuals, info };
}
