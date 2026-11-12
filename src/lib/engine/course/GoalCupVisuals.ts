import * as THREE from "three";

/** Standard recessed vertical depth (in meters) from cup rim turf level to cup floor. */
export const CUP_DEPTH = 0.30;

/**
 * Builds the 3D recessed cup liner group (`Visual_Cup_Cavity`) anchored at the cup rim.
 * Includes the matte interior cylinder, bottom disc, high-contrast amber target ring,
 * and ceramic white rim collar.
 */
export function createCupVisualGroup(
  cupRimPos: THREE.Vector3,
  cupDepth: number = CUP_DEPTH
): THREE.Group {
  const cupGroup = new THREE.Group();
  cupGroup.name = "Visual_Cup_Cavity";
  cupGroup.position.set(cupRimPos.x, cupRimPos.y, cupRimPos.z);

  // 1. Dark matte cup interior cavity
  const interiorGeo = new THREE.CylinderGeometry(0.38, 0.38, cupDepth, 32, 1, false);
  const interiorMat = new THREE.MeshStandardMaterial({
    color: 0x121214,
    roughness: 0.85,
    metalness: 0.05,
  });
  const interiorMesh = new THREE.Mesh(interiorGeo, interiorMat);
  interiorMesh.position.y = -cupDepth * 0.5;
  interiorMesh.receiveShadow = true;
  cupGroup.add(interiorMesh);

  // 2. High-contrast target indicator ring seated cleanly at the bottom of the hole
  const bottomDiscGeo = new THREE.CircleGeometry(0.36, 32);
  bottomDiscGeo.rotateX(-Math.PI / 2);
  const bottomDiscMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
  const bottomDisc = new THREE.Mesh(bottomDiscGeo, bottomDiscMat);
  bottomDisc.position.y = -cupDepth + 0.008;
  cupGroup.add(bottomDisc);

  const targetRingGeo = new THREE.RingGeometry(0.18, 0.30, 32);
  targetRingGeo.rotateX(-Math.PI / 2);
  const targetRingMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    side: THREE.DoubleSide,
  });
  const targetRing = new THREE.Mesh(targetRingGeo, targetRingMat);
  targetRing.position.y = -cupDepth + 0.012;
  cupGroup.add(targetRing);

  // 3. Crisp ceramic white cup rim collar at turf edge
  const rimGeo = new THREE.RingGeometry(0.36, 0.425, 32);
  rimGeo.rotateX(-Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xf3f4f6,
    roughness: 0.2,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = 0.005;
  rimMesh.receiveShadow = true;
  cupGroup.add(rimMesh);

  return cupGroup;
}

/**
 * Creates a bottom-anchored tournament flag billboard planted at `cupFloorPos`.
 * Falls back cleanly to a minimal transparent sprite in headless Node environments.
 */
export function createFlagBillboard(cupFloorPos: THREE.Vector3): THREE.Sprite {
  if (typeof document === "undefined") {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
    sprite.center.set(0.5, 0);
    sprite.scale.set(1.5, 1.5, 1.0);
    sprite.position.set(cupFloorPos.x, cupFloorPos.y, cupFloorPos.z);
    return sprite;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);

    // Slender gold flagpole extending flush to the bottom edge (cup bottom)
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(61, 16, 6, 112);
    ctx.beginPath();
    ctx.arc(64, 16, 5, 0, Math.PI * 2);
    ctx.fill();

    // Vibrant pennant flag
    ctx.beginPath();
    ctx.moveTo(67, 20);
    ctx.lineTo(122, 36);
    ctx.lineTo(67, 52);
    ctx.closePath();
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    // Pin icon
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⛳", 88, 36);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0);
  sprite.scale.set(1.6, 1.6, 1.0);
  sprite.position.set(cupFloorPos.x, cupFloorPos.y, cupFloorPos.z);
  return sprite;
}

/** Disposes geometries, materials, and canvas textures owned by cup visuals. */
export function disposeCupVisuals(
  cupGroup: THREE.Group | null,
  flagSprite: THREE.Sprite | null
): void {
  if (cupGroup) {
    for (const child of cupGroup.children) {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }
  if (flagSprite) {
    flagSprite.material.map?.dispose();
    flagSprite.material.dispose();
  }
}

