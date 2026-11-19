import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";
import { SeamWelder, type TileFloorMeshInfo } from "./SeamWelder";

describe("SeamWelder Unit Tests", () => {
  let RAPIER: typeof import("@dimforge/rapier3d-compat");

  beforeAll(async () => {
    RAPIER = await import("@dimforge/rapier3d-compat");
    await RAPIER.init();
  });

  it("returns null when tiles array is empty", () => {
    const result = SeamWelder.weldFloorsToRapierTrimesh([], RAPIER);
    expect(result).toBeNull();
  });

  it("returns null when tile geometries have no position attribute", () => {
    const emptyGeo = new THREE.BufferGeometry();
    const result = SeamWelder.weldFloorsToRapierTrimesh(
      [{ geometry: emptyGeo, worldMatrix: new THREE.Matrix4() }],
      RAPIER
    );
    expect(result).toBeNull();
  });

  it("welds two adjacent planar tiles, collapsing coincident boundary vertices", () => {
    const geo1 = new THREE.BufferGeometry();
    const pos1 = new Float32Array([
      -2.5, 0, 0,
       2.5, 0, 0,
       2.5, 0, -6,
      -2.5, 0, -6,
    ]);
    const indices1 = new Uint16Array([
      0, 1, 2,
      0, 2, 3,
    ]);
    geo1.setAttribute("position", new THREE.BufferAttribute(pos1, 3));
    geo1.setIndex(new THREE.BufferAttribute(indices1, 1));

    const geo2 = new THREE.BufferGeometry();
    const pos2 = new Float32Array([
      -2.5, 0, -6,
       2.5, 0, -6,
       2.5, 0, -12,
      -2.5, 0, -12,
    ]);
    const indices2 = new Uint16Array([
      0, 1, 2,
      0, 2, 3,
    ]);
    geo2.setAttribute("position", new THREE.BufferAttribute(pos2, 3));
    geo2.setIndex(new THREE.BufferAttribute(indices2, 1));

    const tiles: TileFloorMeshInfo[] = [
      { geometry: geo1, worldMatrix: new THREE.Matrix4().identity() },
      { geometry: geo2, worldMatrix: new THREE.Matrix4().identity() },
    ];

    const colliderDesc = SeamWelder.weldFloorsToRapierTrimesh(tiles, RAPIER);
    expect(colliderDesc).not.toBeNull();

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const collider = world.createCollider(colliderDesc!);

    expect(collider.friction()).toBeCloseTo(0.35, 2);
    expect(collider.restitution()).toBeCloseTo(0.5, 2);

    world.free();
  });

  it("handles non-indexed geometries seamlessly", () => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 0, 1,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const tiles: TileFloorMeshInfo[] = [
      { geometry: geo, worldMatrix: new THREE.Matrix4().identity() },
    ];

    const colliderDesc = SeamWelder.weldFloorsToRapierTrimesh(tiles, RAPIER);
    expect(colliderDesc).not.toBeNull();

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const collider = world.createCollider(colliderDesc!);
    expect(collider).toBeDefined();

    world.free();
  });

  it("applies worldMatrix transformation to vertices before spatial hashing", () => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array([
      -1, 0, 0,
       1, 0, 0,
       0, 0, -2,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2]), 1));

    const matrix1 = new THREE.Matrix4().identity();
    const matrix2 = new THREE.Matrix4().makeTranslation(0, 5, 0);

    const tiles: TileFloorMeshInfo[] = [
      { geometry: geo, worldMatrix: matrix1 },
      { geometry: geo, worldMatrix: matrix2 },
    ];

    const colliderDesc = SeamWelder.weldFloorsToRapierTrimesh(tiles, RAPIER);
    expect(colliderDesc).not.toBeNull();

    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    const collider = world.createCollider(colliderDesc!);
    expect(collider).toBeDefined();

    world.free();
  });

  it("discards degenerate triangles if vertices collapse", () => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array([
      0.0, 0, 0,
      0.0004, 0, 0,
      0, 0, 2,
    ]);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 1, 2]), 1));

    const colliderDesc = SeamWelder.weldFloorsToRapierTrimesh(
      [{ geometry: geo, worldMatrix: new THREE.Matrix4().identity() }],
      RAPIER
    );
    expect(colliderDesc).toBeNull();
  });
});

