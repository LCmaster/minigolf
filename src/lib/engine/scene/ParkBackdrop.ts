/**
 * ParkBackdrop.ts
 * Sunlit horizon park terrain with distant rolling hills, sky fog,
 * and an auto-fitted delimited perimeter fence around placed course bounds.
 */

import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

export interface CourseBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function createSeededRandom(seed = 42): () => number {
  let a = seed >>> 0;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export class ParkBackdrop {
  public readonly group: THREE.Group;
  private groundMesh: THREE.Mesh;
  private groundGeo: THREE.PlaneGeometry;
  private groundMat: THREE.MeshStandardMaterial;
  private fenceGroup: THREE.Group;
  private postMat: THREE.MeshStandardMaterial;
  private railMat: THREE.MeshStandardMaterial;
  private noise2D = createNoise2D(createSeededRandom(2026));
  private showBoundary = true;

  private static readonly LAWN_Y = -0.08;
  private static readonly GRID_SIZE = 280;
  private static readonly GRID_SEGMENTS = 72;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = "Park_Backdrop";

    this.groundGeo = new THREE.PlaneGeometry(
      ParkBackdrop.GRID_SIZE,
      ParkBackdrop.GRID_SIZE,
      ParkBackdrop.GRID_SEGMENTS,
      ParkBackdrop.GRID_SEGMENTS
    );
    this.groundGeo.rotateX(-Math.PI / 2);

    this.groundMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.02,
    });

    this.groundMesh = new THREE.Mesh(this.groundGeo, this.groundMat);
    this.groundMesh.name = "Park_Horizon_Ground";
    this.groundMesh.receiveShadow = true;
    this.group.add(this.groundMesh);

    this.fenceGroup = new THREE.Group();
    this.fenceGroup.name = "Park_Perimeter_Fence";
    this.group.add(this.fenceGroup);

    this.postMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.65,
    });
    this.railMat = new THREE.MeshStandardMaterial({
      color: 0xd99b52,
      roughness: 0.55,
    });

    scene.add(this.group);

    this.updateBounds({ minX: -14, maxX: 14, minZ: -20, maxZ: 10 }, true);
  }

  public computeCourseBounds(
    positions: Array<{ x: number; z: number }>,
    padding: number = 9.0
  ): CourseBounds {
    if (positions.length === 0) {
      return { minX: -14, maxX: 14, minZ: -20, maxZ: 10 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const p of positions) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    // Ensure minimum cozy park plot size (at least 26m x 26m)
    const cx = 0.5 * (minX + maxX);
    const cz = 0.5 * (minZ + maxZ);
    const halfW = Math.max(13, 0.5 * (maxX - minX) + padding);
    const halfD = Math.max(13, 0.5 * (maxZ - minZ) + padding);

    return {
      minX: cx - halfW,
      maxX: cx + halfW,
      minZ: cz - halfD,
      maxZ: cz + halfD,
    };
  }

  public updateFromCourse(courseManager: {
    getAllTiles: () => Array<{ group: THREE.Object3D }>;
    getAllProps?: () => Array<{ group: THREE.Object3D }>;
    showBoundary?: boolean;
  }): void {
    const positions: Array<{ x: number; z: number }> = [];
    for (const t of courseManager.getAllTiles()) {
      positions.push({ x: t.group.position.x, z: t.group.position.z });
    }
    if (courseManager.getAllProps) {
      for (const p of courseManager.getAllProps()) {
        positions.push({ x: p.group.position.x, z: p.group.position.z });
      }
    }
    const bounds = this.computeCourseBounds(positions);
    const show = courseManager.showBoundary ?? this.showBoundary;
    this.updateBounds(bounds, show);
  }

  public updateBounds(bounds: CourseBounds, showBoundary: boolean = true): void {
    this.showBoundary = showBoundary;
    this.rebuildGroundGeometry(bounds);
    this.rebuildPerimeterFence(bounds, showBoundary);
  }

  private rebuildGroundGeometry(bounds: CourseBounds): void {
    const posAttr = this.groundGeo.attributes.position as THREE.BufferAttribute;
    const count = posAttr.count;
    const colors = new Float32Array(count * 3);

    const innerColor = new THREE.Color(0x49b638); // Lush park grass inside delimited zone
    const hillColor = new THREE.Color(0x3a9b35);  // Slightly deeper meadow green on distant hills

    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      // Signed box distance outside the delimited fence bounds
      const dx = Math.max(bounds.minX - x, 0, x - bounds.maxX);
      const dz = Math.max(bounds.minZ - z, 0, z - bounds.maxZ);
      const distOut = Math.hypot(dx, dz);

      const blend = smoothstep(3.0, 22.0, distOut);
      const hillRaw =
        Math.max(0, this.noise2D(x * 0.022, z * 0.022) * 0.5 + 0.5) * 7.5 +
        this.noise2D(x * 0.055 + 11.3, z * 0.055 - 7.1) * 1.8;

      const y = ParkBackdrop.LAWN_Y + blend * Math.max(0, hillRaw);
      posAttr.setY(i, y);

      const c = innerColor.clone().lerp(hillColor, blend * 0.85);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    this.groundGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    this.groundGeo.computeVertexNormals();
    posAttr.needsUpdate = true;
  }

  private rebuildPerimeterFence(bounds: CourseBounds, visible: boolean): void {
    while (this.fenceGroup.children.length > 0) {
      const child = this.fenceGroup.children[0] as THREE.Mesh;
      this.fenceGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }

    this.fenceGroup.visible = visible;
    if (!visible) return;

    const corners: Array<[number, number]> = [
      [bounds.minX, bounds.minZ],
      [bounds.maxX, bounds.minZ],
      [bounds.maxX, bounds.maxZ],
      [bounds.minX, bounds.maxZ],
    ];

    const postGeo = new THREE.BoxGeometry(0.28, 1.05, 0.28);
    const postMatrices: THREE.Matrix4[] = [];
    const railMatrices: THREE.Matrix4[] = [];
    const railGeo = new THREE.BoxGeometry(1, 0.12, 0.10);

    const dummy = new THREE.Object3D();

    for (let e = 0; e < 4; e++) {
      const [ax, az] = corners[e];
      const [bx, bz] = corners[(e + 1) % 4];
      const edgeLen = Math.hypot(bx - ax, bz - az);
      const spans = Math.max(2, Math.round(edgeLen / 4.0));
      const angle = Math.atan2(bx - ax, bz - az);

      for (let s = 0; s < spans; s++) {
        const t = s / spans;
        const px = ax + (bx - ax) * t;
        const pz = az + (bz - az) * t;
        dummy.position.set(px, ParkBackdrop.LAWN_Y + 0.52, pz);
        dummy.rotation.set(0, angle, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        postMatrices.push(dummy.matrix.clone());

        // Mid-span top & bottom rails
        const tMid = (s + 0.5) / spans;
        const rx = ax + (bx - ax) * tMid;
        const rz = az + (bz - az) * tMid;
        const spanLen = edgeLen / spans;

        for (const railY of [ParkBackdrop.LAWN_Y + 0.36, ParkBackdrop.LAWN_Y + 0.78]) {
          dummy.position.set(rx, railY, rz);
          dummy.rotation.set(0, Math.atan2(bz - az, bx - ax) * -1, 0);
          dummy.scale.set(spanLen, 1, 1);
          dummy.updateMatrix();
          railMatrices.push(dummy.matrix.clone());
        }
      }
    }

    const postsInst = new THREE.InstancedMesh(postGeo, this.postMat, postMatrices.length);
    postsInst.castShadow = true;
    postsInst.receiveShadow = true;
    postMatrices.forEach((m, idx) => postsInst.setMatrixAt(idx, m));
    postsInst.instanceMatrix.needsUpdate = true;
    this.fenceGroup.add(postsInst);

    const railsInst = new THREE.InstancedMesh(railGeo, this.railMat, railMatrices.length);
    railsInst.castShadow = true;
    railsInst.receiveShadow = true;
    railMatrices.forEach((m, idx) => railsInst.setMatrixAt(idx, m));
    railsInst.instanceMatrix.needsUpdate = true;
    this.fenceGroup.add(railsInst);
  }

  public dispose(): void {
    this.groundGeo.dispose();
    this.groundMat.dispose();
    this.postMat.dispose();
    this.railMat.dispose();
    while (this.fenceGroup.children.length > 0) {
      const child = this.fenceGroup.children[0] as THREE.Mesh;
      this.fenceGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }
  }
}
