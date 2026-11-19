/**
 * StylizedMaterials.ts
 * Lightweight Three.js stylized materials matching the Carnival Park aesthetic
 * (two-tone striped fairway turf and animated turquoise pond water).
 */

import * as THREE from "three";

/**
 * Creates a crisp two-tone emerald/lime striped fairway turf material.
 * Falls back safely to a solid MeshStandardMaterial in headless/SSR environments.
 */
export function createCarnivalTurfMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.02,
  });

  if (typeof document === "undefined") {
    mat.color.setHex(0x36b532);
    return mat;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#269e29";
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#3ec230";
    ctx.fillRect(0, 64, 64, 64);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  mat.map = tex;
  return mat;
}

/**
 * Creates a stylized turquoise pond water material with subtle Voronoi-like caustics.
 */
export function createPondWaterMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x18c7df,
    roughness: 0.14,
    metalness: 0.05,
    transparent: true,
    opacity: 0.88,
  });

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      varying vec3 vPondWorldPos;
      ${shader.vertexShader}
    `.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      vPondWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `
    );

    shader.fragmentShader = `
      varying vec3 vPondWorldPos;
      ${shader.fragmentShader}
    `.replace(
      "#include <color_fragment>",
      `
      #include <color_fragment>
      float r1 = sin(vPondWorldPos.x * 2.4 + vPondWorldPos.z * 1.9);
      float r2 = cos(vPondWorldPos.x * 1.8 - vPondWorldPos.z * 2.7);
      float caustic = smoothstep(0.55, 0.92, abs(r1 * r2));
      vec3 baseAqua = vec3(0.06, 0.78, 0.88);
      vec3 foamLine = vec3(0.62, 0.96, 1.0);
      diffuseColor.rgb = mix(baseAqua, foamLine, caustic * 0.65);
      `
    );
  };

  return mat;
}

