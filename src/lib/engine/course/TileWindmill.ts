/**
 * TileWindmill.ts
 * Couples `WindmillVisuals` with a kinematic Rapier rigid body & 4 bumper blade colliders
 * so mistimed shots physically deflect off the rotating windmill sails.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {
  WindmillVisuals,
  WINDMILL_HUB_OFFSET,
  WINDMILL_BLADE_LENGTH,
  WINDMILL_BLADE_WIDTH,
  WINDMILL_BLADE_DEPTH,
  hideLegacyWindmillBlades,
} from "./WindmillVisuals";

const BLADE_ANGLES = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];

export interface TileWindmill {
  visuals: WindmillVisuals;
  rigidBody: RAPIER.RigidBody;
  colliders: RAPIER.Collider[];
  update: (deltaTime: number) => void;
  dispose: () => void;
}

/** Returns `true` when `kitPieceId` represents a windmill obstacle tile. */
export function isWindmillTile(kitPieceId: string): boolean {
  return kitPieceId.toLowerCase().includes("windmill");
}

/** Attaches rotating blades and kinematic Rapier colliders to a windmill tile group. */
export function createTileWindmill(
  rapier: typeof RAPIER,
  rapierWorld: RAPIER.World,
  tileGroup: THREE.Group,
  bumperColliderHandles: Set<number>
): TileWindmill {
  tileGroup.updateMatrixWorld(true);
  hideLegacyWindmillBlades(tileGroup);

  const visuals = new WindmillVisuals();
  tileGroup.add(visuals.group);

  const hubWorldPos = new THREE.Vector3(...WINDMILL_HUB_OFFSET).applyMatrix4(tileGroup.matrixWorld);
  const tileWorldQuat = new THREE.Quaternion();
  tileGroup.getWorldQuaternion(tileWorldQuat);

  const bodyDesc = rapier.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(hubWorldPos.x, hubWorldPos.y, hubWorldPos.z)
    .setRotation({ x: tileWorldQuat.x, y: tileWorldQuat.y, z: tileWorldQuat.z, w: tileWorldQuat.w });
  const rigidBody = rapierWorld.createRigidBody(bodyDesc);

  const colliders: RAPIER.Collider[] = [];
  const armOffset = WINDMILL_BLADE_LENGTH * 0.5;
  for (const angle of BLADE_ANGLES) {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
    const colDesc = rapier.ColliderDesc.cuboid(
      WINDMILL_BLADE_WIDTH * 0.5,
      WINDMILL_BLADE_LENGTH * 0.5,
      WINDMILL_BLADE_DEPTH * 0.5
    )
      .setTranslation(Math.sin(angle) * armOffset, -Math.cos(angle) * armOffset, 0)
      .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
      .setRestitution(1.05)
      .setFriction(0.1)
      .setActiveEvents(rapier.ActiveEvents.COLLISION_EVENTS);

    const collider = rapierWorld.createCollider(colDesc, rigidBody);
    colliders.push(collider);
    bumperColliderHandles.add(collider.handle);
  }

  const update = (deltaTime: number): void => {
    visuals.update(deltaTime);
    tileGroup.getWorldQuaternion(tileWorldQuat);
    const nextWorldQuat = tileWorldQuat.multiply(visuals.rotorGroup.quaternion);
    rigidBody.setNextKinematicRotation({
      x: nextWorldQuat.x,
      y: nextWorldQuat.y,
      z: nextWorldQuat.z,
      w: nextWorldQuat.w,
    });
  };

  const dispose = (): void => {
    for (const col of colliders) {
      bumperColliderHandles.delete(col.handle);
    }
    rapierWorld.removeRigidBody(rigidBody);
    tileGroup.remove(visuals.group);
    visuals.dispose();
  };

  return { visuals, rigidBody, colliders, update, dispose };
}

