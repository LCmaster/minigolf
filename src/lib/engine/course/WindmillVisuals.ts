/**
 * WindmillVisuals.ts
 * Four-blade rotating Cartoon Arcade windmill rotor hovering across the tile archway opening.
 */

import * as THREE from "three";

/** Local hub offset relative to a windmill tile center [x, y, z] in meters. */
export const WINDMILL_HUB_OFFSET = [0, 1.85, 1.35] as const;
/** Length from hub center to outer blade tip so bottom sails sweep through ball height (< 0.20m). */
export const WINDMILL_BLADE_LENGTH = 1.72;
export const WINDMILL_BLADE_WIDTH = 0.44;
export const WINDMILL_BLADE_DEPTH = 0.16;
/** Steady angular velocity in radians per second. */
export const WINDMILL_ANGULAR_SPEED = 1.15;

const BLADE_ANGLES = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2];

/** Hides static GLTF placeholder blades (`Mesh_Blade_*`) when attaching the live rotor. */
export function hideLegacyWindmillBlades(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (/^Mesh_Blade_/i.test(child.name)) {
      child.visible = false;
    }
  });
}

export class WindmillVisuals {
  public readonly group: THREE.Group;
  public readonly rotorGroup: THREE.Group;
  public readonly blades: THREE.Mesh[] = [];
  private readonly disposableGeometries: THREE.BufferGeometry[] = [];
  private readonly disposableMaterials: THREE.Material[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "Visual_Windmill_Rotor";
    this.group.position.set(...WINDMILL_HUB_OFFSET);

    const hubGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.34, 16);
    hubGeo.rotateX(Math.PI / 2);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.2,
    });
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    hubMesh.castShadow = true;
    this.group.add(hubMesh);
    this.disposableGeometries.push(hubGeo);
    this.disposableMaterials.push(hubMat);

    this.rotorGroup = new THREE.Group();
    this.rotorGroup.name = "Visual_Windmill_Blades";
    this.group.add(this.rotorGroup);

    const redMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.35, metalness: 0.08 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.08 });
    this.disposableMaterials.push(redMat, goldMat);

    const armOffset = WINDMILL_BLADE_LENGTH * 0.5;
    for (let i = 0; i < BLADE_ANGLES.length; i++) {
      const geo = new THREE.BoxGeometry(WINDMILL_BLADE_WIDTH, WINDMILL_BLADE_LENGTH, WINDMILL_BLADE_DEPTH);
      const blade = new THREE.Mesh(geo, i % 2 === 0 ? redMat : goldMat);
      blade.castShadow = true;

      const angle = BLADE_ANGLES[i];
      // Offset along the rotated -Y arm so angle=0 places blade 0 directly below hub (y = -armOffset)
      blade.position.set(Math.sin(angle) * armOffset, -Math.cos(angle) * armOffset, 0);
      blade.rotation.z = angle;

      this.rotorGroup.add(blade);
      this.blades.push(blade);
      this.disposableGeometries.push(geo);
    }
  }

  /** Advances blade rotation by `deltaTime` seconds. */
  public update(deltaTime: number): void {
    if (deltaTime <= 0) return;
    this.rotorGroup.rotation.z += WINDMILL_ANGULAR_SPEED * deltaTime;
  }

  public dispose(): void {
    for (const geo of this.disposableGeometries) geo.dispose();
    for (const mat of this.disposableMaterials) mat.dispose();
  }
}
