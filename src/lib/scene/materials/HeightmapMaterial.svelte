<script>
  import { T } from "@threlte/core";
  import { Color } from "three";

  export let color = "#567D46";

  const onBeforeCompile = (shader) => {
    shader.uniforms.uTileColor = { value: new Color(color) };

    shader.vertexShader = `
      attribute vec3 aSurface;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec3 vSurface;
      ${shader.vertexShader}
    `.replace(
      `#include <begin_vertex>`,
      `
      #include <begin_vertex>
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      vSurface = aSurface;
      `
    );

    shader.fragmentShader = `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec3 vSurface;
      uniform vec3 uTileColor;

      // GLSL Simplex Noise 3D
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy) );
        vec3 x0 = v - i + dot(i, C.xxx) ;
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_ );
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
      }

      ${shader.fragmentShader}
    `.replace(
      `#include <color_fragment>`,
      `
      #include <color_fragment>

      float fairwayW = clamp(vSurface.x, 0.0, 1.0);
      float bermW = clamp(vSurface.y, 0.0, 1.0);
      float cupW = clamp(vSurface.z, 0.0, 1.0);

      // 1. Fairway turf (mowed checkerboard stripes + fine grain)
      float grain = snoise(vWorldPosition * 45.0) * 0.5 + 0.5;
      float stripeX = sin(vWorldPosition.x * 2.2) * sin(vWorldPosition.z * 2.2);
      float mowStripe = smoothstep(-0.2, 0.2, stripeX) * 0.08;
      vec3 fairwayColor = uTileColor * (0.92 + grain * 0.16 + mowStripe);

      // 2. Berm / Collar border (rich wood-earth / deep fringe tone so bank edges read clearly)
      float woodGrain = snoise(vWorldPosition * 12.0) * 0.5 + 0.5;
      vec3 bermColor = mix(vec3(0.42, 0.30, 0.16), vec3(0.28, 0.45, 0.18), 0.35) * (0.88 + woodGrain * 0.24);

      // 3. Outer Rough Hills, Sandy Shoreline & Steep Rock Faces
      float macroNoise = snoise(vWorldPosition * 0.25) * 0.5 + 0.5;
      vec3 hillGrass = mix(vec3(0.24, 0.44, 0.12), vec3(0.32, 0.53, 0.17), macroNoise);
      vec3 cliffRock = vec3(0.45, 0.48, 0.52) * (0.85 + grain * 0.25);
      float rockMask = 1.0 - smoothstep(0.68, 0.86, abs(vWorldNormal.y));
      vec3 outerColor = mix(hillGrass, cliffRock, rockMask);

      // Sandy beach transition near water level (y = -1.0)
      vec3 shoreSand = vec3(0.86, 0.78, 0.54) * (0.9 + grain * 0.15);
      float shoreMask = 1.0 - smoothstep(-0.98, -0.58, vWorldPosition.y);
      outerColor = mix(outerColor, shoreSand, shoreMask);

      // Blend zones together
      vec3 finalCol = mix(outerColor, fairwayColor, fairwayW);
      finalCol = mix(finalCol, bermColor, clamp(bermW * 0.9, 0.0, 1.0));
      // Darken inside the cup
      finalCol = mix(finalCol, vec3(0.08, 0.08, 0.08), clamp(cupW * 0.95, 0.0, 1.0));

      diffuseColor.rgb = finalCol;
      `
    );
  };

  let materialRef;
  $: {
    if (materialRef && materialRef.userData.shader) {
      materialRef.userData.shader.uniforms.uTileColor.value.set(color);
    }
  }
</script>

<T.MeshStandardMaterial
  bind:ref={materialRef}
  {color}
  roughness={0.92}
  metalness={0.0}
  {onBeforeCompile}
  {...$$restProps}
/>

