/**
 * AssetLoader.ts
 * Preloads, caches, and separates visual meshes, UBX collision proxies, and socket locators.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { KitManifest, KitPieceMetadata, SocketDefinition } from "../types/KitTypes";
import { createCarnivalTurfMaterial, createPondWaterMaterial } from "./StylizedMaterials";

export interface ParsedKitPiece {
  metadata: KitPieceMetadata;
  visualTemplate: THREE.Group;
  ubxFloorGeometry: THREE.BufferGeometry | null;
  ubxWallLGeometry: THREE.BufferGeometry | null;
  ubxWallRGeometry: THREE.BufferGeometry | null;
  ubxWallBackGeometry: THREE.BufferGeometry | null;
  ubxColliderGeometries: THREE.BufferGeometry[];
  sockets: SocketDefinition[];
  locators: Map<string, THREE.Vector3>;
}

export class AssetLoader {
  private loader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private manifest: KitManifest | null = null;
  private pieces: Map<string, ParsedKitPiece> = new Map();
  private sharedMaterial: THREE.MeshStandardMaterial | null = null;
  private carnivalTurfMaterial: THREE.MeshStandardMaterial | null = null;
  private pondWaterMaterial: THREE.MeshStandardMaterial | null = null;

  constructor() {
    this.loader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
  }

  public async init(manifestUrl: string = "/models/kit/manifest.json"): Promise<void> {
    const res = await fetch(manifestUrl);
    this.manifest = await res.json();

    if (!this.manifest) {
      throw new Error("Failed to load kit manifest");
    }

    // Load PBR Trim Sheet textures (GLTF convention requires flipY = false)
    if (this.manifest.trimSheet) {
      const diffTex = await this.textureLoader.loadAsync("/" + this.manifest.trimSheet.diffuse);
      diffTex.colorSpace = THREE.SRGBColorSpace;
      diffTex.flipY = false;

      const normTex = await this.textureLoader.loadAsync("/" + this.manifest.trimSheet.normal);
      normTex.flipY = false;

      const roughTex = await this.textureLoader.loadAsync("/" + this.manifest.trimSheet.roughness);
      roughTex.flipY = false;

      this.sharedMaterial = new THREE.MeshStandardMaterial({
        map: diffTex,
        normalMap: normTex,
        normalScale: new THREE.Vector2(1.2, 1.2),
        roughnessMap: roughTex,
        roughness: 0.9,
        metalness: 0.05,
      });
    }

    this.carnivalTurfMaterial = createCarnivalTurfMaterial();
    this.pondWaterMaterial = createPondWaterMaterial();

    // Preload and parse all pieces in manifest
    for (const [id, meta] of Object.entries(this.manifest.pieces)) {
      await this.loadPiece(id, meta);
    }
  }

  private async loadPiece(id: string, meta: KitPieceMetadata): Promise<void> {
    const gltf = await this.loader.loadAsync("/" + meta.glbPath);
    const root = gltf.scene;

    const visualGroup = new THREE.Group();
    visualGroup.name = `Visual_${id}`;

    let ubxFloorGeo: THREE.BufferGeometry | null = null;
    let ubxWallLGeo: THREE.BufferGeometry | null = null;
    let ubxWallRGeo: THREE.BufferGeometry | null = null;
    let ubxWallBackGeo: THREE.BufferGeometry | null = null;
    const ubxColliderGeos: THREE.BufferGeometry[] = [];

    const locators = new Map<string, THREE.Vector3>();
    const sockets: SocketDefinition[] = [];
    const keepPieceMaterials = Boolean(meta.preserveMaterials);

    root.updateMatrixWorld(true);

    // Traverse scene hierarchy
    root.traverse((child) => {
      // Strip Blender duplicate suffixes whether dot is preserved ("UBX_Wall_L.001") or sanitized by GLTFLoader ("UBX_Wall_L001")
      const cleanName = child.name.replace(/(?:\.\d+|\d{3})+$/, "");

      if (cleanName.startsWith("Mesh_") && child instanceof THREE.Mesh) {
        const mesh = child.clone();
        mesh.name = cleanName;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (!keepPieceMaterials && this.sharedMaterial) {
          mesh.material = this.sharedMaterial;
        } else if (keepPieceMaterials) {
          const matName = (mesh.material as THREE.Material | undefined)?.name || "";
          if (matName.includes("FairwayTurf") && this.carnivalTurfMaterial) {
            mesh.material = this.carnivalTurfMaterial;
          } else if (matName.includes("PondWater") && this.pondWaterMaterial) {
            mesh.material = this.pondWaterMaterial;
            mesh.castShadow = false;
          }
        }

        visualGroup.add(mesh);
      } else if (cleanName === "UBX_Floor" && child instanceof THREE.Mesh) {
        ubxFloorGeo = child.geometry.clone();
        ubxFloorGeo.applyMatrix4(child.matrixWorld);
      } else if (cleanName === "UBX_Wall_L" && child instanceof THREE.Mesh) {
        ubxWallLGeo = child.geometry.clone();
        ubxWallLGeo.applyMatrix4(child.matrixWorld);
      } else if (cleanName === "UBX_Wall_R" && child instanceof THREE.Mesh) {
        ubxWallRGeo = child.geometry.clone();
        ubxWallRGeo.applyMatrix4(child.matrixWorld);
      } else if ((cleanName === "UBX_Wall_Back" || cleanName === "UBX_Wall_B") && child instanceof THREE.Mesh) {
        ubxWallBackGeo = child.geometry.clone();
        ubxWallBackGeo.applyMatrix4(child.matrixWorld);
      } else if (cleanName.startsWith("UBX_") && child instanceof THREE.Mesh) {
        const colGeo = child.geometry.clone();
        colGeo.applyMatrix4(child.matrixWorld);
        ubxColliderGeos.push(colGeo);
      } else if (cleanName.startsWith("LOC_Socket_")) {
        // Extract socket definition, preferring precise metadata from manifest if present
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(child.quaternion);
        const metaSocket = meta.sockets.find((s) => s.id === cleanName || s.id === child.name);
        sockets.push({
          id: cleanName,
          position: metaSocket ? metaSocket.position : [child.position.x, child.position.y, child.position.z],
          normal: metaSocket ? metaSocket.normal : [forward.x, forward.y, forward.z],
          type: metaSocket ? metaSocket.type : "track_arcade_6m",
          elevation: metaSocket ? metaSocket.elevation : child.position.y,
        });
        locators.set(cleanName, child.position.clone());
      } else if (cleanName.startsWith("LOC_")) {
        locators.set(cleanName, child.position.clone());
      }
    });

    this.pieces.set(id, {
      metadata: meta,
      visualTemplate: visualGroup,
      ubxFloorGeometry: ubxFloorGeo,
      ubxWallLGeometry: ubxWallLGeo,
      ubxWallRGeometry: ubxWallRGeo,
      ubxWallBackGeometry: ubxWallBackGeo,
      ubxColliderGeometries: ubxColliderGeos,
      sockets: sockets.length > 0 ? sockets : meta.sockets,
      locators,
    });
  }

  public getPiece(id: string): ParsedKitPiece | undefined {
    return this.pieces.get(id);
  }

  public getManifest(): KitManifest | null {
    return this.manifest;
  }
}

