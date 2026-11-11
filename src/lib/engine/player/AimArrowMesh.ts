/**
 * AimArrowMesh.ts
 * Dynamic 3D slingshot arrow indicator with smooth Green -> Yellow -> Red power gradient
 * and high-power aim jitter.
 */

import * as THREE from "three";

export class AimArrowMesh {
  public group: THREE.Group;
  private arrowMesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.visible = false;

    // Arrow Geometry: Stem + Head
    const shape = new THREE.Shape();
    const stemHalfW = 0.12;
    const headW = 0.35;
    const headL = 0.45;

    // Drawing arrow pointing along -Z
    shape.moveTo(-stemHalfW, 0);
    shape.lineTo(-stemHalfW, 1.0 - headL);
    shape.lineTo(-headW, 1.0 - headL);
    shape.lineTo(0, 1.0);
    shape.lineTo(headW, 1.0 - headL);
    shape.lineTo(stemHalfW, 1.0 - headL);
    shape.lineTo(stemHalfW, 0);
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    // Rotate flat onto ground plane (XZ)
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uPower: { value: 0.0 }, // 0.0 to 1.0
        uColorGreen: { value: new THREE.Color("#68D391") },
        uColorYellow: { value: new THREE.Color("#F6E05E") },
        uColorRed: { value: new THREE.Color("#E53E3E") },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uPower;
        uniform vec3 uColorGreen;
        uniform vec3 uColorYellow;
        uniform vec3 uColorRed;
        varying vec2 vUv;

        void main() {
          // Interpolate color based on power
          vec3 col = uPower < 0.5
            ? mix(uColorGreen, uColorYellow, uPower * 2.0)
            : mix(uColorYellow, uColorRed, (uPower - 0.5) * 2.0);

          float alpha = 0.85 + sin(vUv.y * 10.0) * 0.1;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    this.arrowMesh = new THREE.Mesh(geometry, this.material);
    this.arrowMesh.position.y = 0.03; // Slightly above turf
    this.group.add(this.arrowMesh);
  }

  public update(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    power: number,
    time: number,
    jitterOffsetAngle?: number
  ): void {
    if (power <= 0.01) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;
    this.group.position.copy(origin);

    // Aim direction angle (pointing along -Z natively, rotate around +Y)
    let angle = Math.atan2(-direction.x, -direction.z);

    if (typeof jitterOffsetAngle === "number") {
      angle += jitterOffsetAngle;
    } else if (power > 0.75) {
      // Fallback visual wobble when caller omits coupled jitter angle
      const jitterFactor = (power - 0.75) / 0.25;
      angle += Math.sin(time * 40) * 0.08 * jitterFactor;
    }

    this.group.rotation.y = angle;

    // Scale length with progressive curved power (min 0.75m, max 4.0m)
    const length = 0.75 + Math.min(1, Math.max(0, power)) * 3.25;
    this.arrowMesh.scale.set(1.0, 1.0, length);

    this.material.uniforms.uPower.value = Math.min(1, Math.max(0, power));
  }

  public hide(): void {
    this.group.visible = false;
  }
}

