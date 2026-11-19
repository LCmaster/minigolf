/**
 * AutoDecorate.ts
 * Generates non-destructive surrounding props (hill knolls under elevated tiles,
 * Carnival tee arch, trees, boulders, toadstools, grass tufts, wildflowers)
 * around any modular tile layout without overwriting user-placed props.
 */

import type { PlacedTile, PlacedProp } from "../types/CourseSchema";

function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function autoDecorateHole(
  tiles: PlacedTile[],
  existingProps: PlacedProp[],
  theme: "country_club" | "carnival_park" = "carnival_park",
  seed: number = 101
): PlacedProp[] {
  if (tiles.length === 0) return [];

  const rng = createSeededRandom(seed);
  const additions: PlacedProp[] = [];
  const allOccupancy = existingProps.map((p) => ({ x: p.position[0], z: p.position[2] }));
  const tileCenters = tiles
    .filter((t) => Array.isArray(t.position))
    .map((t) => ({
      x: t.position![0],
      y: t.position![1],
      z: t.position![2],
      tile: t,
    }));

  if (tileCenters.length === 0) return [];

  const isClearOfTrack = (x: number, z: number, minTrackDist = 6.2, minPropDist = 3.2): boolean => {
    for (const tc of tileCenters) {
      if (Math.hypot(x - tc.x, z - tc.z) < minTrackDist) return false;
    }
    for (const op of allOccupancy) {
      if (Math.hypot(x - op.x, z - op.z) < minPropDist) return false;
    }
    return true;
  };

  // 1. Place hill knolls under elevated foundation/flat tiles (y >= 1.2)
  for (const tc of tileCenters) {
    const id = tc.tile.kitPieceId;
    if (tc.y >= 1.2 && !id.includes("ramp") && !id.includes("bridge")) {
      const hasKnoll = existingProps.some(
        (p) => p.propId === "terrain_hill_knoll_6x6" && Math.hypot(p.position[0] - tc.x, p.position[2] - tc.z) < 3.0
      );
      if (!hasKnoll) {
        additions.push({
          instanceId: `auto_knoll_${tc.tile.instanceId}_${Date.now()}`,
          propId: "terrain_hill_knoll_6x6",
          position: [tc.x, tc.y - 1.5, tc.z],
          rotation: [0, Math.round(rng() * 8) * 45, 0],
          scale: [1, 1, 1],
        });
      }
    }
  }

  // 2. Place Carnival arch over the tee tile if Carnival theme & none exists near tee
  const tee = tileCenters[0];
  if (theme === "carnival_park" && tee) {
    const hasArch = existingProps.some(
      (p) => p.propId === "prop_carnival_arch_6m" && Math.hypot(p.position[0] - tee.x, p.position[2] - tee.z) < 4.5
    );
    if (!hasArch) {
      const yaw = tee.tile.rotationY || 0;
      const rad = (yaw * Math.PI) / 180;
      // Place arch slightly behind tee spawn along +Z local
      additions.push({
        instanceId: `auto_arch_${Date.now()}`,
        propId: "prop_carnival_arch_6m",
        position: [tee.x + Math.sin(rad) * 2.0, tee.y, tee.z + Math.cos(rad) * 2.0],
        rotation: [0, yaw, 0],
        scale: [1, 1, 1],
      });
    }
  }

  // 3. Compute padded perimeter bounds for nature scatter
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const tc of tileCenters) {
    if (tc.x < minX) minX = tc.x;
    if (tc.x > maxX) maxX = tc.x;
    if (tc.z < minZ) minZ = tc.z;
    if (tc.z > maxZ) maxZ = tc.z;
  }
  minX -= 8.0; maxX += 8.0; minZ -= 8.0; maxZ += 8.0;

  const treeProp = theme === "carnival_park" ? "prop_tree_puffy" : "prop_tree_oak";
  const rockProp = theme === "carnival_park" ? "prop_boulder_faceted" : "prop_rock_mossy";

  const candidateTypes =
    theme === "carnival_park"
      ? [
          treeProp,
          treeProp,
          rockProp,
          "prop_toadstool_pair",
          "prop_grass_tuft",
          "prop_wildflower_patch",
        ]
      : [treeProp, treeProp, rockProp];

  let placed = 0;
  for (let attempt = 0; attempt < 90 && placed < 16; attempt++) {
    const x = minX + rng() * (maxX - minX);
    const z = minZ + rng() * (maxZ - minZ);
    if (!isClearOfTrack(x, z)) continue;

    const propId = candidateTypes[placed % candidateTypes.length];
    const scaleVal = 0.85 + rng() * 0.4;
    additions.push({
      instanceId: `auto_prop_${placed}_${Date.now()}`,
      propId,
      position: [Number(x.toFixed(2)), 0, Number(z.toFixed(2))],
      rotation: [0, Math.round(rng() * 360), 0],
      scale: [Number(scaleVal.toFixed(2)), Number(scaleVal.toFixed(2)), Number(scaleVal.toFixed(2))],
    });
    allOccupancy.push({ x, z });
    placed++;
  }

  return additions;
}

