import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import type { AssetLoader, ParsedKitPiece } from "../kitbash/AssetLoader";
import type { PlacedProp } from "../types/CourseSchema";
import { BoosterVisuals } from "./BoosterVisuals";

/** Runtime data stored for an active booster volume sensor collider. */
export interface BoosterSensorInfo {
  direction: THREE.Vector3;
  impulse: number;
  center: THREE.Vector3;
  /** Hovering chevron visuals animated by the engine and flashed on trigger. */
  visuals?: BoosterVisuals;
}

/** Instantiated placed prop with its scene group and physics colliders. */
export interface InstantiatedProp {
  propData: PlacedProp;
  pieceTemplate: ParsedKitPiece;
  group: THREE.Group;
  colliders: RAPIER.Collider[];
  boosterVisuals?: BoosterVisuals;
}

export interface PropInstanceManagerDeps {
  scene: THREE.Scene;
  rapierWorld: RAPIER.World;
  rapier: typeof RAPIER;
  assetLoader: AssetLoader;
  boosterSensors: Map<number, BoosterSensorInfo>;
  bumperColliderHandles: Set<number>;
  onChanged?: () => void;
}

/**
 * Builds a static Rapier trimesh `ColliderDesc` from a Three.js geometry and world matrix.
 * Shared across track rails, terrain overlays, and placed props.
 */
export function createStaticTrimeshColliderDesc(
  rapier: typeof RAPIER,
  geo: THREE.BufferGeometry,
  matrix: THREE.Matrix4
): RAPIER.ColliderDesc | null {
  const pos = geo.attributes.position;
  if (!pos) return null;

  const verts = new Float32Array(pos.count * 3);
  const tempVec = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    tempVec.fromBufferAttribute(pos, i);
    tempVec.applyMatrix4(matrix);
    verts[i * 3] = tempVec.x;
    verts[i * 3 + 1] = tempVec.y;
    verts[i * 3 + 2] = tempVec.z;
  }

  const indices = geo.index
    ? new Uint32Array(geo.index.array)
    : new Uint32Array(Array.from({ length: pos.count }, (_, i) => i));

  const collider = rapier.ColliderDesc.trimesh(verts, indices);
  collider.setFriction(0.4);
  collider.setRestitution(0.6); // Wood rail bounce
  return collider;
}

/**
 * Owns runtime prop instances (meshes, Rapier colliders, booster sensors, and bumper tags)
 * for a course hole.
 */
export class PropInstanceManager {
  private readonly props: Map<string, InstantiatedProp> = new Map();
  private readonly deps: PropInstanceManagerDeps;

  constructor(deps: PropInstanceManagerDeps) {
    this.deps = deps;
  }

  /** Updates an existing prop's position/rotation (degrees) by rebuilding its visual & physics bodies. */
  public updatePropTransform(
    instanceId: string,
    position: [number, number, number],
    rotation: [number, number, number]
  ): boolean {
    const existing = this.props.get(instanceId);
    if (!existing) return false;

    const updated: PlacedProp = {
      ...existing.propData,
      position: [...position] as [number, number, number],
      rotation: [...rotation] as [number, number, number],
      scale: [...existing.propData.scale] as [number, number, number],
    };

    this.removeProp(instanceId);
    this.addProp(updated);
    return true;
  }

  /** Instantiates a prop visual clone and registers its static colliders and trigger sensors. */
  public addProp(propData: PlacedProp): InstantiatedProp | null {
    const { scene, rapierWorld, rapier, assetLoader, boosterSensors, bumperColliderHandles, onChanged } =
      this.deps;
    const template = assetLoader.getPiece(propData.propId);
    if (!template) {
      console.warn(`Prop template not found: ${propData.propId}`);
      return null;
    }

    const group = template.visualTemplate.clone(true);
    group.position.set(...propData.position);
    group.rotation.set(
      (propData.rotation[0] * Math.PI) / 180,
      (propData.rotation[1] * Math.PI) / 180,
      (propData.rotation[2] * Math.PI) / 180
    );
    group.scale.set(...propData.scale);
    group.userData = { propInstanceId: propData.instanceId };
    scene.add(group);
    group.updateMatrixWorld(true);

    const colliders: RAPIER.Collider[] = [];
    let boosterVisuals: BoosterVisuals | undefined;
    const isBumper = Boolean(template.metadata?.tags?.includes("bumper"));
    const isBooster = Boolean(template.metadata?.tags?.includes("booster"));
    if (isBooster) {
      // Replace the legacy flat pad with two hovering glowing chevrons
      const legacyPad = group.getObjectByName("Mesh_Booster_Pad");
      if (legacyPad) legacyPad.visible = false;
      boosterVisuals = new BoosterVisuals();
      boosterVisuals.update(0);
      group.add(boosterVisuals.group);
    }

    const colliderGeos: THREE.BufferGeometry[] = [
      ...(template.ubxColliderGeometries || []),
      ...(template.ubxFloorGeometry ? [template.ubxFloorGeometry] : []),
    ];

    for (const geo of colliderGeos) {
      const desc = createStaticTrimeshColliderDesc(rapier, geo, group.matrixWorld);
      if (desc) {
        if (isBumper) {
          desc.setRestitution(1.15);
          desc.setFriction(0.15);
        }
        const col = rapierWorld.createCollider(desc);
        if (isBumper) {
          bumperColliderHandles.add(col.handle);
        }
        colliders.push(col);
      }
    }

    if (template.ubxSensorGeometry) {
      const sensorDesc = createStaticTrimeshColliderDesc(
        rapier,
        template.ubxSensorGeometry,
        group.matrixWorld
      );
      if (sensorDesc) {
        sensorDesc.setSensor(true).setActiveEvents(rapier.ActiveEvents.COLLISION_EVENTS);
        const sensorCol = rapierWorld.createCollider(sensorDesc);
        colliders.push(sensorCol);
        if (isBooster) {
          const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(group.quaternion).normalize();
          boosterSensors.set(sensorCol.handle, {
            direction: forwardDir,
            impulse: 0.038,
            center: group.position.clone(),
            visuals: boosterVisuals,
          });
        }
      }
    }

    const instantiated: InstantiatedProp = {
      propData,
      pieceTemplate: template,
      group,
      colliders,
      boosterVisuals,
    };
    this.props.set(propData.instanceId, instantiated);
    onChanged?.();
    return instantiated;
  }

  /** Removes a prop visual group, its Rapier colliders, and any sensor/bumper registrations. */
  public removeProp(instanceId: string): boolean {
    const prop = this.props.get(instanceId);
    if (!prop) return false;

    const { scene, rapierWorld, boosterSensors, bumperColliderHandles, onChanged } = this.deps;
    scene.remove(prop.group);
    prop.boosterVisuals?.dispose();
    for (const col of prop.colliders) {
      boosterSensors.delete(col.handle);
      bumperColliderHandles.delete(col.handle);
      rapierWorld.removeCollider(col, false);
    }
    this.props.delete(instanceId);
    onChanged?.();
    return true;
  }

  public getAllProps(): InstantiatedProp[] {
    return Array.from(this.props.values());
  }

  public getProp(instanceId: string): InstantiatedProp | undefined {
    return this.props.get(instanceId);
  }

  /** Returns serialized copies of all currently placed props for saving/exporting. */
  public exportProps(): PlacedProp[] {
    return Array.from(this.props.values()).map((p) => ({
      ...p.propData,
      position: [...p.propData.position] as [number, number, number],
      rotation: [...p.propData.rotation] as [number, number, number],
      scale: [...p.propData.scale] as [number, number, number],
    }));
  }

  /** Removes all props from scene and physics world (caller clears shared sensor maps on full clear). */
  public clear(): void {
    const { scene, rapierWorld, boosterSensors, bumperColliderHandles } = this.deps;
    for (const prop of this.props.values()) {
      scene.remove(prop.group);
      prop.boosterVisuals?.dispose();
      for (const col of prop.colliders) {
        boosterSensors.delete(col.handle);
        bumperColliderHandles.delete(col.handle);
        rapierWorld.removeCollider(col, false);
      }
    }
    this.props.clear();
  }
}

