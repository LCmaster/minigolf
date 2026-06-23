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

export function snapToHex(x, z) {
  const HEX_RADIUS = TILE_SIZE / Math.sqrt(3);
  const COL_SPACING = HEX_RADIUS * 1.5;
  const ROW_SPACING = Math.sqrt(3) * HEX_RADIUS;
  const HALF_X = (GRID_SIZE * COL_SPACING) / 2;
  const HALF_Z = (GRID_SIZE * ROW_SPACING) / 2;

  let bestX = 0, bestZ = 0, minSq = Infinity;
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const zOffset = (col % 2 === 1) ? ROW_SPACING / 2 : 0;
      const hx = col * COL_SPACING - HALF_X;
      const hz = row * ROW_SPACING + zOffset - HALF_Z;
      const sq = (x - hx) * (x - hx) + (z - hz) * (z - hz);
      if (sq < minSq) {
        minSq = sq;
        bestX = hx;
        bestZ = hz;
      }
    }
  }
  return { x: bestX, z: bestZ };
}
