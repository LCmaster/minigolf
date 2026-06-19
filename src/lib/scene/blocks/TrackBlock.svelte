<script>
  import { T } from "@threlte/core";
  import { Shape, ExtrudeGeometry, LineCurve3, Vector3 } from "three";
  import { AutoColliders, RigidBody } from "@threlte/rapier";
  import { onDestroy } from "svelte";

  export let type = "start"; // 'start' or 'end'
  export let shape = "rounded"; // 'square' or 'rounded'
  export let position = [0, 0, 0];
  export let tangent = new Vector3(0, 0, 1); // direction the track is heading
  export let rotation = 0; // kept for back-compat but we use tangent now
  export let isEditor = false;

  // Track cross-section dimensions (must match SplineTrack exactly)
  const w = 2.5; // half inner width
  const t = 0.2; // wall thickness
  const h = 0.5; // wall height (from top surface downward)
  const floorDepth = 0.1;
  const blockLength = 2.7; // half of totalWidth, how far the cap extends

  // ── Cross-section shapes (identical to SplineTrack) ──────────────────
  const baseShape = (() => {
    const s = new Shape();
    s.moveTo(0, -w - t);
    s.lineTo(0, w + t);
    s.lineTo(-floorDepth, w + t);
    s.lineTo(-floorDepth, -w - t);
    s.lineTo(0, -w - t);
    return s;
  })();

  const tileShape = (() => {
    const s = new Shape();
    s.moveTo(-floorDepth, -w);
    s.lineTo(-floorDepth, w);
    s.lineTo(-floorDepth - 0.02, w);
    s.lineTo(-floorDepth - 0.02, -w);
    s.lineTo(-floorDepth, -w);
    return s;
  })();

  const leftWallShape = (() => {
    const s = new Shape();
    s.moveTo(-floorDepth, w);
    s.lineTo(-floorDepth, w + t);
    s.lineTo(-h, w + t);
    s.lineTo(-h, w);
    s.lineTo(-floorDepth, w);
    return s;
  })();

  const rightWallShape = (() => {
    const s = new Shape();
    s.moveTo(-floorDepth, -w - t);
    s.lineTo(-floorDepth, -w);
    s.lineTo(-h, -w);
    s.lineTo(-h, -w - t);
    s.lineTo(-floorDepth, -w - t);
    return s;
  })();

  // Back wall shape — closes the open end of the block
  const backWallShape = (() => {
    const s = new Shape();
    // A flat rectangle spanning the full width, from floorDepth down to h
    s.moveTo(-floorDepth, -w - t);
    s.lineTo(-floorDepth, w + t);
    s.lineTo(-h, w + t);
    s.lineTo(-h, -w - t);
    s.lineTo(-floorDepth, -w - t);
    return s;
  })();

  // ── Geometry builders ────────────────────────────────────────────────
  let baseGeo, tileGeo, leftWallGeo, rightWallGeo, backWallGeo;
  let previousGeos = null;

  function buildGeometries(pos, tang) {
    disposeGeometries();

    const origin = new Vector3(...pos);
    const dir = tang.clone().normalize();

    // For "start" block: extend BEHIND the start point (opposite of tangent)
    // For "end" block: extend BEYOND the end point (along tangent)
    let pathStart, pathEnd;
    if (type === "start") {
      pathStart = origin.clone().add(dir.clone().multiplyScalar(-blockLength));
      pathEnd = origin.clone();
    } else {
      pathStart = origin.clone();
      pathEnd = origin.clone().add(dir.clone().multiplyScalar(blockLength));
    }

    const extrudePath = new LineCurve3(pathStart, pathEnd);
    const extrudeSettings = {
      extrudePath,
      steps: 1,
      bevelEnabled: false,
    };

    baseGeo = new ExtrudeGeometry(baseShape, extrudeSettings);
    tileGeo = new ExtrudeGeometry(tileShape, extrudeSettings);
    leftWallGeo = new ExtrudeGeometry(leftWallShape, extrudeSettings);
    rightWallGeo = new ExtrudeGeometry(rightWallShape, extrudeSettings);

    // Back wall is a thin slab at the closed end
    const wallThickness = t;
    let wallStart, wallEnd;
    if (type === "start") {
      wallStart = pathStart.clone();
      wallEnd = pathStart
        .clone()
        .add(dir.clone().multiplyScalar(wallThickness));
    } else {
      wallEnd = pathEnd.clone();
      wallStart = pathEnd
        .clone()
        .add(dir.clone().multiplyScalar(-wallThickness));
    }
    const backWallPath = new LineCurve3(wallStart, wallEnd);
    backWallGeo = new ExtrudeGeometry(backWallShape, {
      extrudePath: backWallPath,
      steps: 1,
      bevelEnabled: false,
    });

    previousGeos = [baseGeo, tileGeo, leftWallGeo, rightWallGeo, backWallGeo];
  }

  function disposeGeometries() {
    if (previousGeos) {
      previousGeos.forEach((g) => g?.dispose());
      previousGeos = null;
    }
  }

  onDestroy(() => disposeGeometries());

  // Rebuild whenever inputs change
  $: if (position && tangent) {
    buildGeometries(position, tangent);
  }
</script>

{#if baseGeo}
  <!-- {#if isEditor}
    <T.Group>
      <T.Mesh geometry={baseGeo} castShadow receiveShadow>
        <T.MeshStandardMaterial color="#888888" />
      </T.Mesh>
      <T.Mesh geometry={tileGeo} castShadow receiveShadow>
        <T.MeshStandardMaterial color="#567D46" />
      </T.Mesh>
      <T.Mesh geometry={leftWallGeo} castShadow receiveShadow>
        <T.MeshStandardMaterial color="#8B5A2B" />
      </T.Mesh>
      <T.Mesh geometry={rightWallGeo} castShadow receiveShadow>
        <T.MeshStandardMaterial color="#8B5A2B" />
      </T.Mesh>
      <T.Mesh geometry={backWallGeo} castShadow receiveShadow>
        <T.MeshStandardMaterial color="#8B5A2B" />
      </T.Mesh>
    </T.Group>
  {:else} -->
  <RigidBody type="fixed">
    <T.Group>
      <AutoColliders shape="convexHull">
        <T.Mesh geometry={baseGeo} castShadow receiveShadow>
          <T.MeshStandardMaterial color="#888888" />
        </T.Mesh>
      </AutoColliders>
      <AutoColliders shape="convexHull">
        <T.Mesh geometry={tileGeo} castShadow receiveShadow>
          <T.MeshStandardMaterial color="#567D46" />
        </T.Mesh>
      </AutoColliders>
      <AutoColliders shape="convexHull">
        <T.Mesh geometry={leftWallGeo} castShadow receiveShadow>
          <T.MeshStandardMaterial color="#8B5A2B" />
        </T.Mesh>
      </AutoColliders>
      <AutoColliders shape="convexHull">
        <T.Mesh geometry={rightWallGeo} castShadow receiveShadow>
          <T.MeshStandardMaterial color="#8B5A2B" />
        </T.Mesh>
      </AutoColliders>
      <AutoColliders shape="convexHull">
        <T.Mesh geometry={backWallGeo} castShadow receiveShadow>
          <T.MeshStandardMaterial color="#8B5A2B" />
        </T.Mesh>
      </AutoColliders>
    </T.Group>
  </RigidBody>
  <!-- {/if} -->
{/if}

<!-- Indicators -->
{#if type === "start"}
  <T.Mesh
    position={[position[0], position[1] + floorDepth + 0.02, position[2]]}
    rotation={[-Math.PI / 2, 0, 0]}
    receiveShadow
  >
    <T.CircleGeometry args={[0.4, 32]} />
    <T.MeshStandardMaterial color="#4ade80" />
  </T.Mesh>
{:else}
  <!-- Hole indicator -->
  <T.Mesh
    position={[position[0], position[1] + floorDepth + 0.02, position[2]]}
    rotation={[-Math.PI / 2, 0, 0]}
    receiveShadow
  >
    <T.CircleGeometry args={[0.4, 32]} />
    <T.MeshStandardMaterial color="#111111" />
  </T.Mesh>

  <!-- Flag pole -->
  <T.Mesh
    position={[position[0], position[1] + floorDepth + 1.0, position[2]]}
    castShadow
    receiveShadow
  >
    <T.CylinderGeometry args={[0.02, 0.02, 2, 8]} />
    <T.MeshStandardMaterial color="#cccccc" />
  </T.Mesh>

  <!-- Flag -->
  <T.Mesh
    position={[position[0] + 0.3, position[1] + floorDepth + 1.8, position[2]]}
    castShadow
    receiveShadow
  >
    <T.BoxGeometry args={[0.6, 0.3, 0.02]} />
    <T.MeshStandardMaterial color="#ef4444" />
  </T.Mesh>
{/if}
