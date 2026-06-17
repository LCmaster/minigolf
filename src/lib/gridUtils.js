/**
 * Shared grid constants and snap utility.
 * Must match EditorFloor.svelte's TILE_SIZE.
 */
export const TILE_SIZE = 3;
export const GRID_SIZE = 30;

/**
 * Snap a world coordinate to the nearest tile centre.
 * Tile centres sit at offsets of TILE_SIZE/2 from multiples of TILE_SIZE.
 * @param {number} value  - raw world coordinate (x or z)
 * @param {number} [size] - tile size (defaults to TILE_SIZE)
 * @returns {number}
 */
export function snapToGrid(value, size = TILE_SIZE) {
  const half = size / 2;
  return Math.round((value - half) / size) * size + half;
}
