import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import {
  CUP_DEPTH,
  createCupVisualGroup,
  createFlagBillboard,
  disposeCupVisuals,
} from "./GoalCupVisuals";

describe("GoalCupVisuals", () => {
  it("builds Visual_Cup_Cavity group anchored at the cup rim with interior, target ring, and rim meshes", () => {
    const rimPos = new THREE.Vector3(2.5, 0.4, -3.0);
    const group = createCupVisualGroup(rimPos);

    expect(group.name).toBe("Visual_Cup_Cavity");
    expect(group.position.x).toBeCloseTo(2.5);
    expect(group.position.y).toBeCloseTo(0.4);
    expect(group.position.z).toBeCloseTo(-3.0);
    expect(group.children).toHaveLength(4);

    const interior = group.children[0] as THREE.Mesh;
    expect(interior.position.y).toBeCloseTo(-CUP_DEPTH * 0.5);
    expect(interior.receiveShadow).toBe(true);

    const bottomDisc = group.children[1] as THREE.Mesh;
    expect(bottomDisc.position.y).toBeCloseTo(-CUP_DEPTH + 0.008);

    const targetRing = group.children[2] as THREE.Mesh;
    expect(targetRing.position.y).toBeCloseTo(-CUP_DEPTH + 0.012);
    expect((targetRing.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xf59e0b);

    const rim = group.children[3] as THREE.Mesh;
    expect(rim.position.y).toBeCloseTo(0.005);
    expect(rim.receiveShadow).toBe(true);
  });

  it("creates a bottom-anchored flag sprite even in headless Node environments", () => {
    const floorPos = new THREE.Vector3(1, 0.1, 2);
    const sprite = createFlagBillboard(floorPos);

    expect(sprite).toBeInstanceOf(THREE.Sprite);
    expect(sprite.center.x).toBeCloseTo(0.5);
    expect(sprite.center.y).toBeCloseTo(0);
    expect(sprite.position.x).toBeCloseTo(1);
    expect(sprite.position.y).toBeCloseTo(0.1);
    expect(sprite.position.z).toBeCloseTo(2);
  });

  it("disposes geometries and materials of cup visuals cleanly", () => {
    const group = createCupVisualGroup(new THREE.Vector3(0, 0, 0));
    const sprite = createFlagBillboard(new THREE.Vector3(0, -CUP_DEPTH, 0));

    const mesh = group.children[0] as THREE.Mesh;
    const geoSpy = vi.spyOn(mesh.geometry, "dispose");
    const matSpy = vi.spyOn(mesh.material as THREE.Material, "dispose");
    const spriteMatSpy = vi.spyOn(sprite.material, "dispose");

    disposeCupVisuals(group, sprite);

    expect(geoSpy).toHaveBeenCalledTimes(1);
    expect(matSpy).toHaveBeenCalledTimes(1);
    expect(spriteMatSpy).toHaveBeenCalledTimes(1);
  });
});

