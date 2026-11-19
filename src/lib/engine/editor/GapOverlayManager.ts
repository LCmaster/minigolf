import * as THREE from "three";
import type { InstantiatedTile } from "../course/CourseManager";
import type { PlacedTile } from "../types/CourseSchema";

/**
 * Renders clickable wireframe outlines (`Editor_GapGizmos`) over open-air jump-gap tiles
 * so users can still click to restore, swap, or erase them in the editor.
 */
export class GapOverlayManager {
  private readonly scene: THREE.Scene;
  private readonly group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "Editor_GapGizmos";
    this.scene.add(this.group);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /** Returns pickable gap hit-boxes when visible, or an empty list when hidden. */
  public getPickables(): THREE.Object3D[] {
    if (!this.group.visible || this.group.children.length === 0) return [];
    return this.group.children;
  }

  /** Rebuilds clickable gap wireframes from the currently placed course tiles. */
  public refresh(tiles: InstantiatedTile[]): void {
    this.clearMeshes();

    for (const instantiated of tiles) {
      const instanceId = instantiated.tileData.instanceId;
      const tileData: PlacedTile = instantiated.tileData;
      if (!tileData.isGap) continue;

      const template = instantiated.pieceTemplate;
      const tileGroup: THREE.Group = instantiated.group;
      const dims = template?.metadata?.dimensions || [6, 0.6, 6];
      const w = Math.max(2, dims[0]);
      const l = Math.max(2, dims[2]);

      const hitGeo = new THREE.BoxGeometry(w, 0.45, l);
      const hitMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);

      // Center hit box along the tile span (or midpoint between In/Out sockets if offset)
      const inSock = template?.sockets?.find((s) => s.id === "LOC_Socket_In");
      const outSock = template?.sockets?.find((s) => s.id === "LOC_Socket_Out");
      const centerLocal = new THREE.Vector3(0, 0.12, 0);
      if (inSock && outSock) {
        centerLocal.set(
          (inSock.position[0] + outSock.position[0]) * 0.5,
          (inSock.position[1] + outSock.position[1]) * 0.5 + 0.12,
          (inSock.position[2] + outSock.position[2]) * 0.5
        );
      }

      hitMesh.position.copy(centerLocal.applyEuler(tileGroup.rotation).add(tileGroup.position));
      hitMesh.rotation.copy(tileGroup.rotation);
      hitMesh.userData = { tileInstanceId: instanceId };

      const edges = new THREE.EdgesGeometry(hitGeo);
      const wire = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
      );
      wire.userData = { tileInstanceId: instanceId };
      hitMesh.add(wire);

      this.group.add(hitMesh);
    }
  }

  public dispose(): void {
    this.clearMeshes();
    this.scene.remove(this.group);
  }

  private clearMeshes(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
      for (const sub of child.children) {
        if (sub instanceof THREE.LineSegments) {
          sub.geometry.dispose();
          (sub.material as THREE.Material).dispose();
        }
      }
    }
  }
}

