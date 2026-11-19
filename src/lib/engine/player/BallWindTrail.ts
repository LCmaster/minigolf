/**
 * BallWindTrail.ts
 * 3D aerodynamic slipstream ribbon & flanking wingtip wind streaks for the golf ball.
 * Appears smoothly above a speed threshold (strong putts and booster launches) and
 * fades away gracefully as the ball decelerates.
 */

import * as THREE from "three";

export const WIND_TRAIL_SPEED_THRESHOLD = 4.2;

const MAX_WIND_SPEED = 12.0;
const MAX_POINTS = 20;
const MIN_SAMPLE_DISTANCE = 0.045;
const ATTACK_RATE = 14.0;
const DECAY_RATE = 3.5;

interface RibbonSpec {
  name: string;
  halfWidth: number;
  lateralOffsetStart: number;
  lateralOffsetEnd: number;
  verticalOffset: number;
  baseColorHex: number;
  tailColorHex: number;
  maxOpacity: number;
}

interface RibbonInstance {
  spec: RibbonSpec;
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshBasicMaterial;
  positions: Float32Array;
  colors: Float32Array;
}

const RIBBON_SPECS: RibbonSpec[] = [
  {
    name: "Wind_Trail_Center",
    halfWidth: 0.055,
    lateralOffsetStart: 0,
    lateralOffsetEnd: 0,
    verticalOffset: -0.015,
    baseColorHex: 0xf0f9ff,
    tailColorHex: 0x38bdf8,
    maxOpacity: 0.72,
  },
  {
    name: "Wind_Trail_Left",
    halfWidth: 0.022,
    lateralOffsetStart: -0.088,
    lateralOffsetEnd: -0.145,
    verticalOffset: 0.01,
    baseColorHex: 0xffffff,
    tailColorHex: 0x7dd3fc,
    maxOpacity: 0.58,
  },
  {
    name: "Wind_Trail_Right",
    halfWidth: 0.022,
    lateralOffsetStart: 0.088,
    lateralOffsetEnd: 0.145,
    verticalOffset: 0.01,
    baseColorHex: 0xffffff,
    tailColorHex: 0x7dd3fc,
    maxOpacity: 0.58,
  },
];

function buildRibbonInstance(spec: RibbonSpec): RibbonInstance {
  const vertexCount = MAX_POINTS * 2;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);

  const indices = new Uint16Array((MAX_POINTS - 1) * 6);
  for (let i = 0; i < MAX_POINTS - 1; i++) {
    const v0 = i * 2;
    const v1 = v0 + 1;
    const v2 = v0 + 2;
    const v3 = v0 + 3;
    const base = i * 6;
    indices[base] = v0;
    indices[base + 1] = v2;
    indices[base + 2] = v1;
    indices[base + 3] = v1;
    indices[base + 4] = v2;
    indices[base + 5] = v3;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.setDrawRange(0, 0);

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = spec.name;
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;

  return { spec, mesh, geometry, material, positions, colors };
}

export class BallWindTrail {
  public group: THREE.Group;
  public intensity: number = 0;

  private ribbons: RibbonInstance[];
  private points: THREE.Vector3[] = [];
  private lastForward = new THREE.Vector3(0, 0, -1);

  private readonly tmpDir = new THREE.Vector3();
  private readonly tmpRight = new THREE.Vector3();
  private readonly headColor = new THREE.Color();
  private readonly tailColor = new THREE.Color();
  private readonly mixedColor = new THREE.Color();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = "Visual_Ball_Wind_Trail";
    this.group.visible = false;

    this.ribbons = RIBBON_SPECS.map((spec) => {
      const instance = buildRibbonInstance(spec);
      this.group.add(instance.mesh);
      return instance;
    });
  }

  /**
   * Advances slipstream intensity from ball velocity and updates the 3D ribbon geometry.
   */
  public update(position: THREE.Vector3, velocity: THREE.Vector3, deltaTime: number): void {
    const safeDt = Math.max(0, Math.min(deltaTime, 0.1));
    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);

    if (horizontalSpeed > 0.25) {
      this.lastForward.set(velocity.x, 0, velocity.z).normalize();
    }

    const targetIntensity =
      horizontalSpeed <= WIND_TRAIL_SPEED_THRESHOLD
        ? 0
        : Math.min(1, (horizontalSpeed - WIND_TRAIL_SPEED_THRESHOLD) / (MAX_WIND_SPEED - WIND_TRAIL_SPEED_THRESHOLD));

    const rate = targetIntensity > this.intensity ? ATTACK_RATE : DECAY_RATE;
    const blend = 1 - Math.exp(-rate * safeDt);
    this.intensity += (targetIntensity - this.intensity) * blend;

    if (targetIntensity === 0 && this.intensity < 0.02) {
      this.clear();
      return;
    }

    if (this.intensity <= 0.005) {
      this.group.visible = false;
      return;
    }

    this.recordSample(position);
    this.rebuildGeometry();
    this.group.visible = this.points.length >= 2;
  }

  private recordSample(position: THREE.Vector3): void {
    if (this.points.length === 0) {
      this.points.push(position.clone());
      return;
    }

    const dist = this.points[0].distanceTo(position);
    if (dist >= MIN_SAMPLE_DISTANCE) {
      this.points.unshift(position.clone());
      if (this.points.length > MAX_POINTS) {
        this.points.pop();
      }
    } else {
      this.points[0].copy(position);
    }
  }

  private rebuildGeometry(): void {
    const count = this.points.length;
    if (count < 2) {
      for (const ribbon of this.ribbons) {
        ribbon.geometry.setDrawRange(0, 0);
      }
      return;
    }

    for (const ribbon of this.ribbons) {
      const { spec, positions, colors, geometry, material } = ribbon;
      material.opacity = spec.maxOpacity * this.intensity;
      this.headColor.setHex(spec.baseColorHex);
      this.tailColor.setHex(spec.tailColorHex);

      for (let i = 0; i < count; i++) {
        const pt = this.points[i];
        const prev = this.points[Math.max(0, i - 1)];
        const next = this.points[Math.min(count - 1, i + 1)];

        // Tangent points along travel direction (from trailing sample toward newer sample)
        this.tmpDir.subVectors(prev, next);
        this.tmpDir.y = 0;
        if (this.tmpDir.lengthSq() < 1e-6) {
          this.tmpDir.copy(this.lastForward);
        } else {
          this.tmpDir.normalize();
        }
        this.tmpRight.set(-this.tmpDir.z, 0, this.tmpDir.x);

        const t = i / (count - 1);
        const halfW = spec.halfWidth * (1 - t * 0.88);
        const lateral = spec.lateralOffsetStart + (spec.lateralOffsetEnd - spec.lateralOffsetStart) * t;

        const cx = pt.x + this.tmpRight.x * lateral;
        const cy = pt.y + spec.verticalOffset;
        const cz = pt.z + this.tmpRight.z * lateral;

        const idx = i * 6;
        positions[idx] = cx - this.tmpRight.x * halfW;
        positions[idx + 1] = cy;
        positions[idx + 2] = cz - this.tmpRight.z * halfW;
        positions[idx + 3] = cx + this.tmpRight.x * halfW;
        positions[idx + 4] = cy;
        positions[idx + 5] = cz + this.tmpRight.z * halfW;

        // Smooth fade along ribbon tail: AdditiveBlending turns black into complete transparency
        const fade = Math.pow(1 - t, 1.35);
        this.mixedColor.copy(this.headColor).lerp(this.tailColor, t).multiplyScalar(fade);

        colors[idx] = this.mixedColor.r;
        colors[idx + 1] = this.mixedColor.g;
        colors[idx + 2] = this.mixedColor.b;
        colors[idx + 3] = this.mixedColor.r;
        colors[idx + 4] = this.mixedColor.g;
        colors[idx + 5] = this.mixedColor.b;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      geometry.setDrawRange(0, (count - 1) * 6);
    }
  }

  /** Resets ribbon samples and hides the wind trail immediately. */
  public clear(): void {
    this.intensity = 0;
    this.points.length = 0;
    this.group.visible = false;
    for (const ribbon of this.ribbons) {
      ribbon.material.opacity = 0;
      ribbon.geometry.setDrawRange(0, 0);
    }
  }

  /** Releases geometries and materials allocated by all streak meshes. */
  public dispose(): void {
    this.clear();
    for (const ribbon of this.ribbons) {
      ribbon.geometry.dispose();
      ribbon.material.dispose();
    }
  }
}

