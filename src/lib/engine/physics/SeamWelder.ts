/**
 * SeamWelder.ts
 * Welds adjacent floor boundary vertices across connected modular tiles.
 * Eliminates 'ghost bounces' and physics seam spikes completely.
 */

import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

export interface TileFloorMeshInfo {
  geometry: THREE.BufferGeometry;
  worldMatrix: THREE.Matrix4;
}

export class SeamWelder {
  private static readonly PRECISION = 1000; // 1mm quantization tolerance

  /**
   * Merges multiple floor geometries into a single continuous welded Rapier Trimesh.
   */
  public static weldFloorsToRapierTrimesh(
    tiles: TileFloorMeshInfo[],
    rapier: typeof RAPIER
  ): RAPIER.ColliderDesc | null {
    if (tiles.length === 0) return null;

    const vertexMap = new Map<string, number>();
    const unifiedVertices: number[] = [];
    const unifiedIndices: number[] = [];

    const tempVec = new THREE.Vector3();

    for (const tile of tiles) {
      const geo = tile.geometry;
      const posAttr = geo.attributes.position;
      const indexAttr = geo.index;
      const matrix = tile.worldMatrix;

      if (!posAttr) continue;

      const vertexCount = posAttr.count;
      const localToUnifiedIdx = new Int32Array(vertexCount);

      // 1. Process vertices with spatial hash quantization
      for (let i = 0; i < vertexCount; i++) {
        tempVec.fromBufferAttribute(posAttr, i);
        tempVec.applyMatrix4(matrix);

        // Quantize coordinates to mm grid
        const qx = Math.round(tempVec.x * this.PRECISION);
        const qy = Math.round(tempVec.y * this.PRECISION);
        const qz = Math.round(tempVec.z * this.PRECISION);
        const key = `${qx}_${qy}_${qz}`;

        if (vertexMap.has(key)) {
          localToUnifiedIdx[i] = vertexMap.get(key)!;
        } else {
          const newIdx = unifiedVertices.length / 3;
          // Store exact rounded float
          unifiedVertices.push(qx / this.PRECISION, qy / this.PRECISION, qz / this.PRECISION);
          vertexMap.set(key, newIdx);
          localToUnifiedIdx[i] = newIdx;
        }
      }

      // 2. Remap face indices to unified indices
      if (indexAttr) {
        for (let i = 0; i < indexAttr.count; i += 3) {
          const a = localToUnifiedIdx[indexAttr.getX(i)];
          const b = localToUnifiedIdx[indexAttr.getX(i + 1)];
          const c = localToUnifiedIdx[indexAttr.getX(i + 2)];

          // Degenerate triangle check (if vertices collapsed)
          if (a !== b && b !== c && a !== c) {
            unifiedIndices.push(a, b, c);
          }
        }
      } else {
        // Non-indexed geometry
        for (let i = 0; i < vertexCount; i += 3) {
          const a = localToUnifiedIdx[i];
          const b = localToUnifiedIdx[i + 1];
          const c = localToUnifiedIdx[i + 2];

          if (a !== b && b !== c && a !== c) {
            unifiedIndices.push(a, b, c);
          }
        }
      }
    }

    if (unifiedVertices.length === 0 || unifiedIndices.length === 0) {
      return null;
    }

    const vertexFloatArray = new Float32Array(unifiedVertices);
    const indexUintArray = new Uint32Array(unifiedIndices);

    const colliderDesc = rapier.ColliderDesc.trimesh(vertexFloatArray, indexUintArray);
    colliderDesc.setFriction(0.35);
    colliderDesc.setRestitution(0.5);

    return colliderDesc;
  }
}

