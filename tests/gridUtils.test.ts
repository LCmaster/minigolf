import { describe, it, expect } from "vitest";
import { snapToGrid, snapToHex, TILE_SIZE, GRID_SIZE } from "../src/lib/gridUtils";

describe("gridUtils Unit Tests", () => {
  it("snaps coordinates to nearest tile center at half tile offset", () => {
    // TILE_SIZE is 3, half is 1.5. Center points are ... -4.5, -1.5, 1.5, 4.5, 7.5 ...
    expect(snapToGrid(0)).toBe(1.5);
    expect(snapToGrid(1.4)).toBe(1.5);
    expect(snapToGrid(1.6)).toBe(1.5);
    expect(snapToGrid(3.1)).toBe(4.5);
    expect(snapToGrid(-0.2)).toBe(-1.5);
    expect(snapToGrid(-3.0)).toBe(-1.5);
  });

  it("supports custom tile sizes", () => {
    // Custom size 6, center points at 3, 9, 15, -3, -9...
    expect(snapToGrid(0, 6)).toBe(3);
    expect(snapToGrid(5, 6)).toBe(3);
    expect(snapToGrid(7, 6)).toBe(9);
  });

  it("snaps 2D coordinates to nearest hex cell", () => {
    const point1 = snapToHex(0, 0);
    expect(point1).toHaveProperty("x");
    expect(point1).toHaveProperty("z");
    expect(typeof point1.x).toBe("number");
    expect(typeof point1.z).toBe("number");

    // Re-snapping the snapped point should return the exact same coordinates
    const point2 = snapToHex(point1.x, point1.z);
    expect(point2.x).toBeCloseTo(point1.x, 4);
    expect(point2.z).toBeCloseTo(point1.z, 4);
  });
});

