import { useGltf } from "@threlte/extras";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";

export const useStitchedBlocks = async (blocks) => {
  const tile = await Promise.all(
    [...blocks].map((block) => {
      return useGltf(`/block/${block.type}/${block.variation}.glb`);
    })
  );

  const parts = tile.flatMap((gltf, index) =>
    gltf.nodes.Scene.children.map((child) => {
      const rotation = blocks[index].rotation;
      const offset = blocks[index].position;

      let geometry = child.geometry.clone();
      geometry.rotateY(Math.PI * rotation);
      geometry.translate(offset[0], offset[1], offset[2]);

      return { name: child.name, geometry };
    })
  );

  const slabGeo = BufferGeometryUtils.mergeBufferGeometries(
    parts
      .filter(({ name }) => name.includes("slab"))
      .map(({ geometry }) => geometry)
  );
  const wallGeo = BufferGeometryUtils.mergeBufferGeometries(
    parts
      .filter(({ name }) => name.includes("wall"))
      .map(({ geometry }) => geometry)
  );

  return { slab: slabGeo, wall: wallGeo };
};
