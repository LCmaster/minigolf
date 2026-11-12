/**
 * CourseMinimapData.ts
 * Pure top-down SVG minimap geometry generator from HoleData + KitManifest.
 * Reuses SplineTrackSync's socket chain solver so snapped tracks align seamlessly.
 */

import * as THREE from "three";
import type { AssetLoader } from "../kitbash/AssetLoader";
import { resolveOrderedTileChain, walkOrderedTileChain } from "../spline/SplineTrackSync";
import type { HoleData } from "../types/CourseSchema";
import type { KitManifest } from "../types/KitTypes";

export interface MinimapPoint {
  x: number;
  z: number;
}

export interface MinimapSegment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  elevationStep: number;
  isRamp: boolean;
  isHazard: boolean;
  isGap: boolean;
}

export interface HoleMinimapData {
  viewBox: string;
  polylinePoints: string;
  segments: MinimapSegment[];
  teePoint: MinimapPoint | null;
  cupPoint: MinimapPoint | null;
}

function makeManifestPieceLookup(manifest: KitManifest): AssetLoader {
  return {
    getPiece: (id: string) => {
      const meta = manifest.pieces?.[id];
      if (!meta) return undefined;
      return {
        metadata: meta,
        sockets: meta.sockets || [],
      };
    },
  } as unknown as AssetLoader;
}

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildViewBox(points: MinimapPoint[], padding: number): string {
  if (points.length === 0) {
    return `-10 -20 20 24`;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.z < minZ) minZ = pt.z;
    if (pt.z > maxZ) maxZ = pt.z;
  }

  let width = maxX - minX + padding * 2;
  let height = maxZ - minZ + padding * 2;
  const cx = (minX + maxX) * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  width = Math.max(12, width);
  height = Math.max(12, height);

  return `${roundCoord(cx - width * 0.5)} ${roundCoord(cz - height * 0.5)} ${roundCoord(width)} ${roundCoord(height)}`;
}

/**
 * Generates top-down SVG polyline, colored segment metadata, Tee/Cup badges,
 * and tight bounding `viewBox` for any HoleData definition.
 */
export function buildHoleMinimap(
  hole: HoleData,
  manifest: KitManifest | null | undefined,
  padding: number = 5
): HoleMinimapData {
  const segments: MinimapSegment[] = [];
  const points: MinimapPoint[] = [];
  let teePoint: MinimapPoint | null = null;
  let cupPoint: MinimapPoint | null = null;

  if (manifest?.pieces && hole.tiles.length > 0) {
    const resolved = resolveOrderedTileChain(hole.tiles, makeManifestPieceLookup(manifest));
    for (let i = 0; i < resolved.length; i++) {
      const item = resolved[i];
      const entrySock =
        i === 0
          ? null
          : item.template.sockets.find((s) => s.id === item.entrySocketId) || null;
      const entryWorld = entrySock
        ? new THREE.Vector3(...entrySock.position).applyMatrix4(item.worldMatrix)
        : item.position.clone();
      const exitWorld = item.exitPosition;

      const x1 = roundCoord(entryWorld.x);
      const z1 = roundCoord(entryWorld.z);
      const x2 = roundCoord(exitWorld.x);
      const z2 = roundCoord(exitWorld.z);

      const idLower = item.tile.kitPieceId.toLowerCase();
      segments.push({
        x1,
        z1,
        x2,
        z2,
        elevationStep: item.elevationStep,
        isRamp: idLower.includes("ramp"),
        isHazard: idLower.includes("hazard") || idLower.includes("sand") || idLower.includes("water"),
        isGap: Boolean(item.tile.isGap),
      });

      if (points.length === 0) points.push({ x: x1, z: z1 });
      points.push({ x: x2, z: z2 });

      if (item.tile.instanceId === hole.teeTileId || (!teePoint && idLower.includes("tee"))) {
        teePoint = { x: roundCoord(item.position.x), z: roundCoord(item.position.z) };
      }
      if (item.tile.instanceId === hole.cupTileId || idLower.includes("cup")) {
        cupPoint = { x: roundCoord(item.position.x), z: roundCoord(item.position.z) };
      }
    }
  } else if (hole.splinePath?.nodes && hole.splinePath.nodes.length >= 2) {
    const nodes = hole.splinePath.nodes;
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i].position;
      const b = nodes[i + 1].position;
      segments.push({
        x1: roundCoord(a[0]),
        z1: roundCoord(a[2]),
        x2: roundCoord(b[0]),
        z2: roundCoord(b[2]),
        elevationStep: Math.round(b[1] / 1.5),
        isRamp: Math.abs(b[1] - a[1]) > 0.1,
        isHazard: false,
        isGap: false,
      });
      if (points.length === 0) points.push({ x: roundCoord(a[0]), z: roundCoord(a[2]) });
      points.push({ x: roundCoord(b[0]), z: roundCoord(b[2]) });
    }
    teePoint = points[0] ?? null;
    cupPoint = points[points.length - 1] ?? null;
  } else {
    const { orderedTiles } = walkOrderedTileChain(hole.tiles);
    for (let i = 0; i < orderedTiles.length; i++) {
      const t = orderedTiles[i];
      const pt = {
        x: roundCoord(t.position?.[0] ?? 0),
        z: roundCoord(t.position?.[2] ?? -i * 6),
      };
      points.push(pt);
      if (i > 0) {
        const prev = points[points.length - 2];
        segments.push({
          x1: prev.x,
          z1: prev.z,
          x2: pt.x,
          z2: pt.z,
          elevationStep: Math.round((t.position?.[1] ?? 0) / 1.5),
          isRamp: t.kitPieceId.includes("ramp"),
          isHazard: t.kitPieceId.includes("hazard"),
          isGap: Boolean(t.isGap),
        });
      }
      if (t.instanceId === hole.teeTileId || (!teePoint && t.kitPieceId.includes("tee"))) {
        teePoint = pt;
      }
      if (t.instanceId === hole.cupTileId || t.kitPieceId.includes("cup")) {
        cupPoint = pt;
      }
    }
  }

  if (!teePoint && points.length > 0) teePoint = points[0];
  if (!cupPoint && points.length > 0) cupPoint = points[points.length - 1];

  const polylinePoints = points.map((p) => `${p.x},${p.z}`).join(" ");
  const viewBox = buildViewBox(points, padding);

  return {
    viewBox,
    polylinePoints,
    segments,
    teePoint,
    cupPoint,
  };
}
