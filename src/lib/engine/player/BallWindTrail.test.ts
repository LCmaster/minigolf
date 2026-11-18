import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { BallWindTrail, WIND_TRAIL_SPEED_THRESHOLD } from "./BallWindTrail";

describe("BallWindTrail (TDD)", () => {
  it("initializes hidden with zero intensity and 3 aerodynamic streak meshes", () => {
    const trail = new BallWindTrail();

    expect(trail.group.name).toBe("Visual_Ball_Wind_Trail");
    expect(trail.group.visible).toBe(false);
    expect(trail.intensity).toBe(0);
    expect(trail.group.children.length).toBe(3);

    for (const child of trail.group.children) {
      expect(child).toBeInstanceOf(THREE.Mesh);
      const mesh = child as THREE.Mesh;
      expect(mesh.geometry.drawRange.count).toBe(0);
    }

    trail.dispose();
  });

  it("activates and builds triangle-strip geometry when horizontal speed exceeds threshold", () => {
    const trail = new BallWindTrail();
    const fastVelocity = new THREE.Vector3(0, 0, -(WIND_TRAIL_SPEED_THRESHOLD + 4.0));
    const pos = new THREE.Vector3(0, 0.2, 0);

    for (let step = 0; step < 8; step++) {
      pos.z -= 0.14;
      trail.update(pos, fastVelocity, 0.016);
    }

    expect(trail.group.visible).toBe(true);
    expect(trail.intensity).toBeGreaterThan(0.2);

    for (const child of trail.group.children) {
      const mesh = child as THREE.Mesh;
      expect(mesh.geometry.drawRange.count).toBeGreaterThan(0);
      const indexAttr = mesh.geometry.getIndex()!;
      const positions = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < mesh.geometry.drawRange.count; i++) {
        const vIdx = indexAttr.getX(i);
        expect(vIdx).toBeLessThan(positions.count);
        expect(Number.isFinite(positions.getX(vIdx))).toBe(true);
        expect(Number.isFinite(positions.getY(vIdx))).toBe(true);
        expect(Number.isFinite(positions.getZ(vIdx))).toBe(true);
      }
    }

    trail.dispose();
  });

  it("smoothly decays intensity back to zero and hides as the ball slows down", () => {
    const trail = new BallWindTrail();
    const fastVelocity = new THREE.Vector3(0, 0, -(WIND_TRAIL_SPEED_THRESHOLD + 5.0));
    const pos = new THREE.Vector3(0, 0.2, 0);

    for (let step = 0; step < 12; step++) {
      pos.z -= 0.16;
      trail.update(pos, fastVelocity, 0.016);
    }
    const peakIntensity = trail.intensity;
    expect(peakIntensity).toBeGreaterThan(0.4);

    // One frame after stopping, trail fades smoothly rather than popping off immediately
    trail.update(pos, new THREE.Vector3(0, 0, 0), 0.016);
    expect(trail.intensity).toBeLessThan(peakIntensity);
    expect(trail.intensity).toBeGreaterThan(0);
    expect(trail.group.visible).toBe(true);

    // Over subsequent stationary frames, trail fades completely out and hides
    for (let step = 0; step < 40; step++) {
      trail.update(pos, new THREE.Vector3(0, 0, 0), 0.05);
    }
    expect(trail.intensity).toBe(0);
    expect(trail.group.visible).toBe(false);

    trail.dispose();
  });

  it("clears geometry and hides immediately on clear()", () => {
    const trail = new BallWindTrail();
    const fastVelocity = new THREE.Vector3(0, 0, -(WIND_TRAIL_SPEED_THRESHOLD + 3.0));
    const pos = new THREE.Vector3(0, 0.2, 0);

    for (let step = 0; step < 6; step++) {
      pos.z -= 0.15;
      trail.update(pos, fastVelocity, 0.016);
    }
    expect(trail.group.visible).toBe(true);

    trail.clear();

    expect(trail.intensity).toBe(0);
    expect(trail.group.visible).toBe(false);
    for (const child of trail.group.children) {
      const mesh = child as THREE.Mesh;
      expect(mesh.geometry.drawRange.count).toBe(0);
    }

    trail.dispose();
  });

  it("disposes all geometries and materials cleanly", () => {
    const trail = new BallWindTrail();
    const spies = trail.group.children.flatMap((child) => {
      const mesh = child as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      return [vi.spyOn(mesh.geometry, "dispose"), ...mats.map((m) => vi.spyOn(m, "dispose"))];
    });

    trail.dispose();

    for (const spy of spies) {
      expect(spy).toHaveBeenCalledTimes(1);
    }
  });
});
