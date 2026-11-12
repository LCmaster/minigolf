import * as THREE from "three";
import type { InstantiatedTile } from "../course/CourseManager";
import type { PlacedTile } from "../types/CourseSchema";

/** World-space descriptor for an unconnected tile socket available for snapping. */
export interface OpenSocketInfo {
  tileInstanceId: string;
  socketId: string;
  worldPosition: THREE.Vector3;
  normal: THREE.Vector3;
  elevation: number;
}

/**
 * Manages the Three.js gizmo rings (`Editor_SocketGizmos`) rendered at open tile sockets
 * and handles hover raycasting/highlighting.
 */
export class SocketOverlayManager {
  public openSockets: OpenSocketInfo[] = [];
  public hoveredSocket: OpenSocketInfo | null = null;

  private readonly scene: THREE.Scene;
  private readonly group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "Editor_SocketGizmos";
    this.scene.add(this.group);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
    if (!visible) this.clearHover();
  }

  /** Rebuilds socket ring gizmos from the currently placed course tiles. */
  public refresh(tiles: InstantiatedTile[]): void {
    this.openSockets = [];
    this.clearMeshes();

    for (const instantiated of tiles) {
      const instanceId = instantiated.tileData.instanceId;
      const tileData: PlacedTile = instantiated.tileData;
      const template = instantiated.pieceTemplate;
      const tileGroup = instantiated.group;

      for (const socket of template.sockets) {
        if (tileData.connectedSockets && tileData.connectedSockets[socket.id]) {
          continue;
        }

        const localPos = new THREE.Vector3(...socket.position);
        localPos.applyEuler(tileGroup.rotation);
        const worldPos = new THREE.Vector3().addVectors(tileGroup.position, localPos);

        const localNorm = new THREE.Vector3(...socket.normal);
        localNorm.applyEuler(tileGroup.rotation).normalize();

        const info: OpenSocketInfo = {
          tileInstanceId: instanceId,
          socketId: socket.id,
          worldPosition: worldPos,
          normal: localNorm,
          elevation: worldPos.y,
        };

        this.openSockets.push(info);
        this.createGizmoMesh(info);
      }
    }
  }

  /** Updates hovered socket state from `raycaster` and highlights the hovered ring amber. */
  public updateHover(raycaster: THREE.Raycaster): OpenSocketInfo | null {
    const intersects = raycaster.intersectObjects(this.group.children);
    if (intersects.length > 0) {
      const hit = intersects[0].object as THREE.Mesh;
      this.hoveredSocket = hit.userData.socketInfo as OpenSocketInfo;
      for (const child of this.group.children) {
        if (child instanceof THREE.Mesh) {
          (child.material as THREE.MeshBasicMaterial).color.setHex(
            child === hit ? 0xffaa00 : 0x00ffff
          );
        }
      }
      return this.hoveredSocket;
    }

    this.clearHover();
    return null;
  }

  public clearHover(): void {
    this.hoveredSocket = null;
    for (const child of this.group.children) {
      if (child instanceof THREE.Mesh) {
        (child.material as THREE.MeshBasicMaterial).color.setHex(0x00ffff);
      }
    }
  }

  public dispose(): void {
    this.clearMeshes();
    this.scene.remove(this.group);
  }

  private createGizmoMesh(info: OpenSocketInfo): void {
    const ringGeo = new THREE.TorusGeometry(0.8, 0.08, 16, 32);
    ringGeo.rotateX(Math.PI / 2);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.85,
    });

    const gizmo = new THREE.Mesh(ringGeo, ringMat);
    gizmo.position.copy(info.worldPosition);
    gizmo.position.y += 0.05;
    gizmo.userData = { socketInfo: info };
    this.group.add(gizmo);
  }

  private clearMeshes(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
  }
}
