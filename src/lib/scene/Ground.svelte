<script>
  import { T, useFrame } from "@threlte/core";

  const uniforms = {
    uTime: { value: 0 },
  };

  const onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;

    shader.vertexShader = `
      uniform float uTime;
      varying vec3 vWaterWorldPos;
      ${shader.vertexShader}
    `.replace(
      `#include <begin_vertex>`,
      `
      #include <begin_vertex>
      vec4 wp = modelMatrix * vec4(position, 1.0);
      float wave = sin(wp.x * 0.45 + uTime * 1.6) * cos(wp.z * 0.45 + uTime * 1.3) * 0.035;
      transformed.y += wave;
      vWaterWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `
    );

    shader.fragmentShader = `
      uniform float uTime;
      varying vec3 vWaterWorldPos;
      ${shader.fragmentShader}
    `.replace(
      `#include <color_fragment>`,
      `
      #include <color_fragment>
      vec2 uv1 = vWaterWorldPos.xz * 0.28 + vec2(uTime * 0.18, uTime * 0.14);
      vec2 uv2 = vWaterWorldPos.xz * 0.42 - vec2(uTime * 0.15, uTime * 0.22);

      float r1 = sin(uv1.x * 3.14159) * cos(uv1.y * 3.14159);
      float r2 = sin(uv2.x * 3.14159 + 1.2) * cos(uv2.y * 3.14159 - 0.8);
      float ripple = (r1 + r2) * 0.5;

      vec3 deepWater = vec3(0.09, 0.36, 0.68);
      vec3 midWater = vec3(0.16, 0.56, 0.86);
      vec3 crestFoam = vec3(0.68, 0.90, 0.99);

      vec3 waterCol = mix(deepWater, midWater, smoothstep(-0.6, 0.5, ripple));
      float glint = smoothstep(0.58, 0.82, ripple);
      waterCol = mix(waterCol, crestFoam, glint * 0.55);

      diffuseColor.rgb = waterCol;
      `
    );
  };

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
  });
</script>

<!-- Deep seabed floor below water -->
<T.Mesh position={[0, -1.45, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
  <T.PlaneGeometry args={[1000, 1000]} />
  <T.MeshStandardMaterial
    color="#0c2d48"
    roughness={0.9}
    metalness={0.1}
  />
</T.Mesh>

<!-- Animated Water Surface (replaces old green checkerboard ground) -->
<T.Mesh
  position={[0, -1.0, 0]}
  rotation={[-Math.PI / 2, 0, 0]}
  receiveShadow
>
  <T.PlaneGeometry args={[1000, 1000, 64, 64]} />
  <T.MeshStandardMaterial
    color="#2563eb"
    roughness={0.12}
    metalness={0.65}
    transparent={true}
    opacity={0.88}
    {onBeforeCompile}
  />
</T.Mesh>
