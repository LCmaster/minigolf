import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { AimArrowMesh } from "../src/lib/engine/player/AimArrowMesh";

describe("AimArrowMesh Direction & Rotation (TDD)", () => {
  it("rotates towards the exact aim direction vector without inversion", () => {
    const arrow = new AimArrowMesh();
    const origin = new THREE.Vector3(0, 0, 0);

    // Forward direction (along -Z)
    arrow.update(origin, new THREE.Vector3(0, 0, -1), 0.5, 0);
    expect(arrow.group.rotation.y).toBeCloseTo(0, 2);

    // Right direction (+X)
    arrow.update(origin, new THREE.Vector3(1, 0, 0), 0.5, 0);
    // When pointing along +X, rotation around +Y from (0,0,-1) is -90 deg (-pi/2)
    // Testing the rotated direction vector:
    const forwardVec = new THREE.Vector3(0, 0, -1).applyEuler(arrow.group.rotation);
    expect(forwardVec.x).toBeCloseTo(1.0, 2);
    expect(forwardVec.z).toBeCloseTo(0.0, 2);

    // Left direction (-X)
    arrow.update(origin, new THREE.Vector3(-1, 0, 0), 0.5, 0);
    const leftVec = new THREE.Vector3(0, 0, -1).applyEuler(arrow.group.rotation);
    expect(leftVec.x).toBeCloseTo(-1.0, 2);
    expect(leftVec.z).toBeCloseTo(0.0, 2);

    // Backward direction (+Z)
    arrow.update(origin, new THREE.Vector3(0, 0, 1), 0.5, 0);
    const backVec = new THREE.Vector3(0, 0, -1).applyEuler(arrow.group.rotation);
    expect(backVec.x).toBeCloseTo(0.0, 2);
    expect(backVec.z).toBeCloseTo(1.0, 2);
  });
});

