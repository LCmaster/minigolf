import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { BoosterVisuals, BOOSTER_HOVER_HEIGHT } from "./BoosterVisuals";

describe("BoosterVisuals", () => {
  it("builds two volumetric yellow chevrons hovering above the track pointing along -Z", () => {
    const visuals = new BoosterVisuals();
    expect(visuals.group.name).toBe("Visual_Booster_Chevrons");
    expect(visuals.chevrons.length).toBe(2);

    for (const chevron of visuals.chevrons) {
      expect(chevron.position.y).toBeCloseTo(BOOSTER_HOVER_HEIGHT, 2);
      const mat = chevron.material as THREE.MeshStandardMaterial;
      expect(mat.emissiveIntensity).toBeGreaterThan(0.5);
      // Warm yellow: strong red + green, weak blue
      expect(mat.emissive.r).toBeGreaterThan(0.8);
      expect(mat.emissive.g).toBeGreaterThan(0.6);
      expect(mat.emissive.b).toBeLessThan(0.3);

      chevron.geometry.computeBoundingBox();
      const box = chevron.geometry.boundingBox!;
      // Volumetric (extruded + beveled), not flat
      expect(box.max.y - box.min.y).toBeGreaterThan(0.05);
      // Tip points toward -Z: geometry extends further to -Z than the arm tails reach +Z around origin
      expect(box.min.z).toBeLessThan(-0.1);
    }

    // Rear chevron sits behind (+Z) the front chevron
    expect(visuals.chevrons[0].position.z).toBeGreaterThan(visuals.chevrons[1].position.z);
  });

  it("bobs vertically and pulses emission in a forward sequence", () => {
    const visuals = new BoosterVisuals();
    const ys = new Set<number>();
    const rearEmissive: number[] = [];
    const frontEmissive: number[] = [];

    for (let t = 0; t < 2; t += 0.1) {
      visuals.update(t);
      ys.add(Math.round(visuals.chevrons[0].position.y * 1000));
      rearEmissive.push((visuals.chevrons[0].material as THREE.MeshStandardMaterial).emissiveIntensity);
      frontEmissive.push((visuals.chevrons[1].material as THREE.MeshStandardMaterial).emissiveIntensity);
    }

    expect(ys.size).toBeGreaterThan(3);
    for (const y of ys) {
      expect(y / 1000).toBeGreaterThan(BOOSTER_HOVER_HEIGHT - 0.1);
      expect(y / 1000).toBeLessThan(BOOSTER_HOVER_HEIGHT + 0.1);
    }

    // Pulses are phase-shifted: the chevrons are not always equally bright
    const diffs = rearEmissive.map((v, i) => Math.abs(v - frontEmissive[i]));
    expect(Math.max(...diffs)).toBeGreaterThan(0.2);
  });

  it("flashes white-yellow and scales up on trigger, then settles back", () => {
    const visuals = new BoosterVisuals();
    visuals.update(0);
    const baseScale = visuals.group.scale.x;

    visuals.triggerFlash();
    visuals.update(0.01, 0.01);
    expect(visuals.group.scale.x).toBeGreaterThan(baseScale * 1.15);
    const flashMat = visuals.chevrons[0].material as THREE.MeshStandardMaterial;
    expect(flashMat.emissive.b).toBeGreaterThan(0.5); // shifts toward white

    // Settle after the flash decays
    let t = 0.01;
    for (let i = 0; i < 60; i++) {
      t += 0.02;
      visuals.update(t, 0.02);
    }
    expect(visuals.group.scale.x).toBeCloseTo(baseScale, 2);
    expect(flashMat.emissive.b).toBeLessThan(0.3);
  });

  it("disposes geometries and materials", () => {
    const visuals = new BoosterVisuals();
    let disposed = 0;
    for (const c of visuals.chevrons) {
      c.geometry.addEventListener("dispose", () => disposed++);
    }
    visuals.dispose();
    expect(disposed).toBeGreaterThan(0);
  });
});
