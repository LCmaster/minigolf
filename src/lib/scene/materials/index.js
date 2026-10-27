/**
 * Shared material utilities for scene entities.
 * Keeps material construction out of component scripts.
 */

import { DataTexture, RGBAFormat, NearestFilter } from "three";

let cachedToonGradientMap = null;

/**
 * Creates a 3-step nearest-neighbor gradient map for MeshToonMaterial.
 * Produces a cel-shaded look with a dark shadow, midtone, and highlight band.
 *
 * @returns {DataTexture} A shared 3×1 RGBA DataTexture ready for use as `gradientMap`
 */
export function createToonGradientMap() {
  if (cachedToonGradientMap) return cachedToonGradientMap;

  const data = new Uint8Array([
    80,  80,  80,  255, // Shadow
    160, 160, 160, 255, // Midtone
    255, 255, 255, 255, // Highlight
  ]);

  const texture = new DataTexture(data, 3, 1, RGBAFormat);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.needsUpdate = true;

  cachedToonGradientMap = texture;
  return texture;
}
