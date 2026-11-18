/**
 * EditorRaycastPicker.ts
 * Encapsulates 3D viewport ray setup, plane/surface hit queries, and interactive target
 * priority picking (playable props > track tiles > decorative props).
 */

import * as THREE from "three";
import { getPiecePropRole, type KitPieceMetadata, type PropRole } from "../types/KitTypes";

export interface EditorRaycastPickerDeps {
  getTiles: () => Array<{ tileData: { instanceId: string }; group: THREE.Object3D }>;
  getProps: () => Array<{
    propData: { instanceId: string; propId: string };
    group: THREE.Object3D;
  }>;
  getGapPickables: () => THREE.Object3D[];
  getPropPieceMetadata: (propId: string) => Partial<KitPieceMetadata> | undefined;
}

export type InteractiveTarget = { kind: "prop" | "tile"; id: string };

/** Walks up the parent chain to read `userData[key]` from the owning scene root. */
function findUserDataId(object: THREE.Object3D, key: "propInstanceId" | "tileInstanceId"): string | null {
  let obj: THREE.Object3D | null = object;
  while (obj && !obj.userData?.[key]) {
    obj = obj.parent;
  }
  return obj?.userData?.[key] || null;
}

export class EditorRaycastPicker {
  private readonly deps: EditorRaycastPickerDeps;
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(deps: EditorRaycastPickerDeps) {
    this.deps = deps;
  }

  /** Projects client viewport coordinates onto the active camera ray. */
  public setRayFromClient(
    raycaster: THREE.Raycaster,
    canvas: Pick<HTMLCanvasElement, "getBoundingClientRect">,
    camera: THREE.Camera,
    clientX: number,
    clientY: number
  ): void {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  }

  /** Intersects the viewport ray with a horizontal XZ plane at height `planeY`. */
  public getPointOnPlane(
    raycaster: THREE.Raycaster,
    canvas: Pick<HTMLCanvasElement, "getBoundingClientRect">,
    camera: THREE.Camera,
    clientX: number,
    clientY: number,
    planeY: number
  ): THREE.Vector3 | null {
    this.setRayFromClient(raycaster, canvas, camera, clientX, clientY);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const pt = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, pt) ? pt : null;
  }

  /** Returns the closest hit point on placed track tiles, falling back to the y=0 ground plane. */
  public getSurfaceHitPoint(
    raycaster: THREE.Raycaster,
    canvas: Pick<HTMLCanvasElement, "getBoundingClientRect">,
    camera: THREE.Camera,
    clientX: number,
    clientY: number
  ): THREE.Vector3 | null {
    this.setRayFromClient(raycaster, canvas, camera, clientX, clientY);

    const tileGroups = this.deps.getTiles().map((t) => t.group);
    const hits = tileGroups.length > 0 ? raycaster.intersectObjects(tileGroups, true) : [];
    if (hits.length > 0) {
      return hits[0].point.clone();
    }

    const hitPoint = new THREE.Vector3();
    return raycaster.ray.intersectPlane(this.groundPlane, hitPoint) ? hitPoint : null;
  }

  /**
   * Resolves raycast priority between track tiles and props so overlapping scenery
   * (arches, tents, knolls, rocks) never steals clicks meant for track tiles,
   * while closer playable props (bumpers, boosters) remain clickable above track surfaces.
   */
  public pickInteractiveTarget(raycaster: THREE.Raycaster): InteractiveTarget | null {
    const props = this.deps.getProps();
    const propGroups = props.map((p) => p.group);
    const propHits = propGroups.length > 0 ? raycaster.intersectObjects(propGroups, true) : [];
    const tileHit = this.findHitTile(raycaster);

    let firstAnyProp: { id: string; distance: number } | null = null;
    let firstPlayableProp: { id: string; distance: number } | null = null;

    for (const hit of propHits) {
      const id = findUserDataId(hit.object, "propInstanceId");
      if (!id) continue;
      if (!firstAnyProp) {
        firstAnyProp = { id, distance: hit.distance };
      }
      if (!firstPlayableProp && this.resolvePropRole(id, props) === "playable") {
        firstPlayableProp = { id, distance: hit.distance };
        break;
      }
    }

    if (firstPlayableProp && (!tileHit || firstPlayableProp.distance <= tileHit.distance + 0.05)) {
      return { kind: "prop", id: firstPlayableProp.id };
    }
    if (tileHit) {
      return { kind: "tile", id: tileHit.id };
    }
    if (firstAnyProp) {
      return { kind: "prop", id: firstAnyProp.id };
    }
    return null;
  }

  private resolvePropRole(
    propInstanceId: string,
    props: Array<{ propData: { instanceId: string; propId: string } }>
  ): PropRole {
    const inst = props.find((p) => p.propData.instanceId === propInstanceId);
    if (!inst) return "decorative";
    const meta = this.deps.getPropPieceMetadata(inst.propData.propId);
    if (meta) return getPiecePropRole(meta);
    return getPiecePropRole({ id: inst.propData.propId, tags: [inst.propData.propId] });
  }

  private findHitTile(raycaster: THREE.Raycaster): { id: string; distance: number } | null {
    const targets: THREE.Object3D[] = [
      ...this.deps.getTiles().map((t) => t.group),
      ...this.deps.getGapPickables(),
    ];
    if (targets.length === 0) return null;
    const hits = raycaster.intersectObjects(targets, true);
    if (hits.length === 0) return null;
    const id = findUserDataId(hits[0].object, "tileInstanceId");
    return id ? { id, distance: hits[0].distance } : null;
  }
}
