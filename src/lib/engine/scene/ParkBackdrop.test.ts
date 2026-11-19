import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { ParkBackdrop } from "./ParkBackdrop";

describe("ParkBackdrop Unit Tests", () => {
  it("computes padded bounds around placed tiles and maintains a minimum arena size", () => {
    const scene = new THREE.Scene();
    const backdrop = new ParkBackdrop(scene);

    const bounds = backdrop.computeCourseBounds(
      [
        { x: 0, z: 0 },
        { x: 6, z: -18 },
      ],
      8
    );

    expect(bounds.minX).toBeLessThanOrEqual(-8);
    expect(bounds.maxX).toBeGreaterThanOrEqual(14);
    expect(bounds.minZ).toBeLessThanOrEqual(-26);
    expect(bounds.maxZ).toBeGreaterThanOrEqual(8);

    backdrop.dispose();
  });

  it("keeps ground inside delimited bounds flat at lawn level and toggles perimeter fence", () => {
    const scene = new THREE.Scene();
    const backdrop = new ParkBackdrop(scene);

    backdrop.updateBounds({ minX: -15, maxX: 15, minZ: -15, maxZ: 15 }, true);
    const ground = scene.getObjectByName("Park_Horizon_Ground") as THREE.Mesh;
    const fence = scene.getObjectByName("Park_Perimeter_Fence") as THREE.Group;

    expect(ground).toBeDefined();
    expect(fence.visible).toBe(true);
    expect(fence.children.length).toBe(2); // Instanced posts + instanced rails

    // Verify center vertices inside [-15, 15] are flat at LAWN_Y (-0.08)
    const pos = ground.geometry.attributes.position as THREE.BufferAttribute;
    let centerCount = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (Math.abs(x) < 12 && Math.abs(z) < 12) {
        expect(pos.getY(i)).toBeCloseTo(-0.08, 3);
        centerCount++;
      }
    }
    expect(centerCount).toBeGreaterThan(0);

    backdrop.updateBounds({ minX: -15, maxX: 15, minZ: -15, maxZ: 15 }, false);
    expect(fence.visible).toBe(false);

    backdrop.dispose();
  });
});

