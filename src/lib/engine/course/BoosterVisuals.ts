import * as THREE from "three";

/** Hover height (meters) of the chevron centers above the track surface. */
export const BOOSTER_HOVER_HEIGHT = 0.2;

const CHEVRON_SPACING = 0.5;
const BOB_AMPLITUDE = 0.05;
const BOB_SPEED = 3.0;
const PULSE_SPEED_HZ = 1.4;
/** Delay (in pulse cycles) between rear and front chevron, producing a forward ">>" wave. */
const PULSE_STEP_CYCLES = 0.25;
const IDLE_INTENSITY_MIN = 0.7;
const IDLE_INTENSITY_MAX = 1.8;
const FLASH_DURATION = 0.35;
const FLASH_SCALE_BOOST = 0.3;
const FLASH_INTENSITY_BOOST = 1.5;

const COLOR_YELLOW = new THREE.Color(0xffdd00);
const COLOR_FLASH = new THREE.Color(0xfffbe0);

/** Builds a beveled, extruded chevron lying flat with its tip pointing along -Z. */
function createChevronGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.3);
  shape.lineTo(0.7, -0.2);
  shape.lineTo(0.7, -0.45);
  shape.lineTo(0, 0.05);
  shape.lineTo(-0.7, -0.45);
  shape.lineTo(-0.7, -0.2);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 3,
  });
  geo.translate(0, 0, -0.05); // center thickness around origin
  geo.rotateX(-Math.PI / 2); // extrusion -> up (+Y), shape +Y tip -> -Z
  geo.computeVertexNormals();
  return geo;
}

/**
 * Two glowing yellow chevrons hovering above a booster. They bob, pulse in a
 * forward sequence, and flash/scale when the ball triggers the booster.
 * Purely visual: no physics colliders.
 */
export class BoosterVisuals {
  public readonly group: THREE.Group;
  public readonly chevrons: THREE.Mesh[];
  private flashTimer = 0;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "Visual_Booster_Chevrons";

    const geometry = createChevronGeometry();
    this.chevrons = [CHEVRON_SPACING, -CHEVRON_SPACING].map((z, i) => {
      const material = new THREE.MeshStandardMaterial({
        color: COLOR_YELLOW.clone(),
        emissive: COLOR_YELLOW.clone(),
        emissiveIntensity: IDLE_INTENSITY_MAX,
        roughness: 0.35,
        metalness: 0.1,
      });
      // Share one geometry; give each mesh a distinct reference for disposal safety
      const mesh = new THREE.Mesh(i === 0 ? geometry : geometry.clone(), material);
      mesh.position.set(0, BOOSTER_HOVER_HEIGHT, z);
      mesh.castShadow = false;
      this.group.add(mesh);
      return mesh;
    });
  }

  /** Starts the white-yellow flash + scale-up reaction. */
  public triggerFlash(): void {
    this.flashTimer = FLASH_DURATION;
  }

  /** Advances idle animation (time in seconds) and flash decay (deltaTime in seconds). */
  public update(time: number, deltaTime: number = 0): void {
    this.flashTimer = Math.max(0, this.flashTimer - deltaTime);
    const flash = this.flashTimer / FLASH_DURATION;

    this.group.scale.setScalar(1 + FLASH_SCALE_BOOST * flash);

    this.chevrons.forEach((chevron, i) => {
      chevron.position.y = BOOSTER_HOVER_HEIGHT + Math.sin(time * BOB_SPEED - i * 0.8) * BOB_AMPLITUDE;

      const wave = Math.sin(2 * Math.PI * (time * PULSE_SPEED_HZ - i * PULSE_STEP_CYCLES)) * 0.5 + 0.5;
      const idle = IDLE_INTENSITY_MIN + (IDLE_INTENSITY_MAX - IDLE_INTENSITY_MIN) * wave;

      const mat = chevron.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = idle + FLASH_INTENSITY_BOOST * flash;
      mat.emissive.copy(COLOR_YELLOW).lerp(COLOR_FLASH, flash);
      mat.color.copy(COLOR_YELLOW).lerp(COLOR_FLASH, flash);
    });
  }

  public dispose(): void {
    for (const chevron of this.chevrons) {
      chevron.geometry.dispose();
      (chevron.material as THREE.Material).dispose();
    }
  }
}

