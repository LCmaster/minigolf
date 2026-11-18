/**
 * GoalCupManager.ts
 * Owns the runtime cup of a hole: the solid cup-floor collider, the goal sensor seated at the
 * bottom of the cavity, the sunken liner visuals, and the tournament flag.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import {
  CUP_DEPTH,
  createCupVisualGroup,
  createFlagBillboard,
  disposeCupVisuals,
} from "./GoalCupVisuals";

export class GoalCupManager {
  private readonly scene: THREE.Scene;
  private readonly rapierWorld: RAPIER.World;
  private readonly rapier: typeof RAPIER;

  private goalCollider: RAPIER.Collider | null = null;
  private bottomCollider: RAPIER.Collider | null = null;
  private flagSprite: THREE.Sprite | null = null;
  private cupGroup: THREE.Group | null = null;
  private rimPosition: THREE.Vector3 | null = null;
  private floorPosition: THREE.Vector3 | null = null;

  constructor(scene: THREE.Scene, rapierWorld: RAPIER.World, rapier: typeof RAPIER) {
    this.scene = scene;
    this.rapierWorld = rapierWorld;
    this.rapier = rapier;
  }

  /** Cup rim position (turf level), or `null` when the hole has no cup. */
  public get goalPosition(): THREE.Vector3 | null {
    return this.rimPosition;
  }

  /** Position of the cup floor, `CUP_DEPTH` below the rim. */
  public get cupBottomPosition(): THREE.Vector3 | null {
    return this.floorPosition;
  }

  public get goalSensorCollider(): RAPIER.Collider | null {
    return this.goalCollider;
  }

  public get cupBottomCollider(): RAPIER.Collider | null {
    return this.bottomCollider;
  }

  /** Builds (replacing any previous) cup physics and visuals anchored at `cupRimPos`. */
  public place(cupRimPos: THREE.Vector3): void {
    this.clear();

    const cupFloorY = cupRimPos.y - CUP_DEPTH;
    this.rimPosition = cupRimPos.clone();
    this.floorPosition = new THREE.Vector3(cupRimPos.x, cupFloorY, cupRimPos.z);

    // High-visibility real 3D circular cup liner and bottom indicator
    this.cupGroup = createCupVisualGroup(cupRimPos, CUP_DEPTH);
    this.scene.add(this.cupGroup);

    // Solid cup floor collider to physically catch and support balls at the bottom of the cup
    const bottomDesc = this.rapier.ColliderDesc.cylinder(0.05, 0.44)
      .setTranslation(cupRimPos.x, cupFloorY - 0.05, cupRimPos.z)
      .setFriction(1.5)
      .setRestitution(0.05);
    this.bottomCollider = this.rapierWorld.createCollider(bottomDesc);

    // Goal sensor seated directly on the bottom floor of the cup cavity
    const goalDesc = this.rapier.ColliderDesc.cylinder(0.025, 0.425)
      .setTranslation(cupRimPos.x, cupFloorY + 0.025, cupRimPos.z)
      .setSensor(true)
      .setActiveEvents(this.rapier.ActiveEvents.COLLISION_EVENTS);
    this.goalCollider = this.rapierWorld.createCollider(goalDesc);

    // Tournament flag billboard planted with pole base at the true bottom of the cup
    this.flagSprite = createFlagBillboard(this.floorPosition);
    this.scene.add(this.flagSprite);
  }

  /** Removes the cup's colliders and visuals and forgets its positions. */
  public clear(): void {
    if (this.goalCollider) {
      this.rapierWorld.removeCollider(this.goalCollider, false);
      this.goalCollider = null;
    }
    if (this.bottomCollider) {
      this.rapierWorld.removeCollider(this.bottomCollider, false);
      this.bottomCollider = null;
    }
    if (this.flagSprite) this.scene.remove(this.flagSprite);
    if (this.cupGroup) this.scene.remove(this.cupGroup);
    disposeCupVisuals(this.cupGroup, this.flagSprite);
    this.flagSprite = null;
    this.cupGroup = null;
    this.rimPosition = null;
    this.floorPosition = null;
  }
}
