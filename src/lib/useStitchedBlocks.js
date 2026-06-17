import { useGltf } from "@threlte/extras";
import * as BufferGeometryUtils from "./BufferGeometryUtils";

const cache = new Map();
const MAX_CACHE_SIZE = 5;

export const useStitchedBlocks = async (blocks) => {
  // Generate a unique key based on block configuration
  const cacheKey = JSON.stringify(
    blocks.map(b => ({ type: b.type, var: b.variation, pos: b.position, rot: b.rotation }))
  );

  if (cache.has(cacheKey)) {
    console.log("Stitched blocks cache hit!");
    // Move to end to represent recently used (LRU)
    const result = cache.get(cacheKey);
    cache.delete(cacheKey);
    cache.set(cacheKey, result);
    return result;
  }

  console.log("Stitched blocks cache miss. Computing geometries...");
  const tile = await Promise.all(
    blocks.map((block) => {
      return useGltf(`/block/${block.type}/${block.variation}.glb`);
    })
  );

  const parts = tile.flatMap((gltf, index) =>
    gltf.nodes.Scene.children.map((child) => {
      const rotation = blocks[index].rotation;
      const offset = blocks[index].position;

      let geometry = child.geometry.clone();
      geometry.rotateY(-Math.PI * rotation);
      geometry.translate(offset[0], offset[1], offset[2]);

      return { name: child.name, geometry };
    })
  );

  const rawSlabGeo = BufferGeometryUtils.mergeBufferGeometries(
    parts
      .filter(({ name }) => name.includes("floor"))
      .map(({ geometry }) => geometry)
  );
  const slabGeo = BufferGeometryUtils.mergeVertices(rawSlabGeo, 1e-4);

  const rawWallGeo = BufferGeometryUtils.mergeBufferGeometries(
    parts
      .filter(({ name }) => name.includes("wall"))
      .map(({ geometry }) => geometry)
  );
  const wallGeo = BufferGeometryUtils.mergeVertices(rawWallGeo, 1e-4);

  const result = { slab: slabGeo, wall: wallGeo };

  // Update cache
  cache.set(cacheKey, result);
  if (cache.size > MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }

  return result;
};
