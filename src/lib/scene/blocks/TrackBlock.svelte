<script>
  import { T } from "@threlte/core";
  import { Shape, ExtrudeGeometry, Vector3, Quaternion, Euler } from "three";
  import { AutoColliders, Collider, RigidBody } from "@threlte/rapier";
  import { onDestroy } from "svelte";
  import { createMiterGeometry } from "$lib/trackGeometry";

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

  $: euler = (() => {
    const localZ = new Vector3(0, 0, 1);
    const targetDir = tangent.clone().normalize();
    const q = new Quaternion().setFromUnitVectors(localZ, targetDir);
    return new Euler().setFromQuaternion(q, "YXZ");
  })();

  function buildGeometries(currentShape, currentType) {
    disposeGeometries();

    const R_base = w + t; // 2.7
    const R_tile = w; // 2.5

    const baseShapeLocal = new Shape();
    const tileShapeLocal = new Shape();
    const wallShapeLocal = new Shape();

    if (currentType === "start") {
      if (currentShape === "rounded") {
        baseShapeLocal.moveTo(R_base, 0);
        baseShapeLocal.absarc(0, 0, R_base, 0, Math.PI, false); // CCW
        baseShapeLocal.lineTo(R_base, 0);

        tileShapeLocal.moveTo(R_tile, 0);
        tileShapeLocal.absarc(0, 0, R_tile, 0, Math.PI, false); // CCW
        tileShapeLocal.lineTo(R_tile, 0);

        wallShapeLocal.moveTo(R_base, 0);
        wallShapeLocal.absarc(0, 0, R_base, 0, Math.PI, false); // CCW outer
        wallShapeLocal.lineTo(-R_tile, 0); // inward
        wallShapeLocal.absarc(0, 0, R_tile, Math.PI, 0, true); // CW inner
        wallShapeLocal.lineTo(R_base, 0); // close
      } else {
        baseShapeLocal.moveTo(R_base, 0);
        baseShapeLocal.lineTo(R_base, blockLength);
        baseShapeLocal.lineTo(-R_base, blockLength);
        baseShapeLocal.lineTo(-R_base, 0);
        baseShapeLocal.lineTo(R_base, 0);

        tileShapeLocal.moveTo(R_tile, 0);
        tileShapeLocal.lineTo(R_tile, blockLength - t);
        tileShapeLocal.lineTo(-R_tile, blockLength - t);
        tileShapeLocal.lineTo(-R_tile, 0);
        tileShapeLocal.lineTo(R_tile, 0);

        wallShapeLocal.moveTo(R_base, 0);
        wallShapeLocal.lineTo(R_base, blockLength);
        wallShapeLocal.lineTo(-R_base, blockLength);
        wallShapeLocal.lineTo(-R_base, 0);
        wallShapeLocal.lineTo(-R_tile, 0);
        wallShapeLocal.lineTo(-R_tile, blockLength - t);
        wallShapeLocal.lineTo(R_tile, blockLength - t);
        wallShapeLocal.lineTo(R_tile, 0);
        wallShapeLocal.lineTo(R_base, 0);
      }
    } else {
      if (currentShape === "rounded") {
        baseShapeLocal.moveTo(-R_base, 0);
        baseShapeLocal.absarc(0, 0, R_base, Math.PI, 2 * Math.PI, false); // CCW
        baseShapeLocal.lineTo(-R_base, 0);

        tileShapeLocal.moveTo(-R_tile, 0);
        tileShapeLocal.absarc(0, 0, R_tile, Math.PI, 2 * Math.PI, false); // CCW
        tileShapeLocal.lineTo(-R_tile, 0);

        wallShapeLocal.moveTo(-R_base, 0);
        wallShapeLocal.absarc(0, 0, R_base, Math.PI, 2 * Math.PI, false); // CCW outer
        wallShapeLocal.lineTo(R_tile, 0); // inward
        wallShapeLocal.absarc(0, 0, R_tile, 2 * Math.PI, Math.PI, true); // CW inner
        wallShapeLocal.lineTo(-R_base, 0); // close
      } else {
        baseShapeLocal.moveTo(-R_base, 0);
        baseShapeLocal.lineTo(-R_base, -blockLength);
        baseShapeLocal.lineTo(R_base, -blockLength);
        baseShapeLocal.lineTo(R_base, 0);
        baseShapeLocal.lineTo(-R_base, 0);

        tileShapeLocal.moveTo(-R_tile, 0);
        tileShapeLocal.lineTo(-R_tile, -blockLength + t);
        tileShapeLocal.lineTo(R_tile, -blockLength + t);
        tileShapeLocal.lineTo(R_tile, 0);
        tileShapeLocal.lineTo(-R_tile, 0);

        wallShapeLocal.moveTo(-R_base, 0);
        wallShapeLocal.lineTo(-R_base, -blockLength);
        wallShapeLocal.lineTo(R_base, -blockLength);
        wallShapeLocal.lineTo(R_base, 0);
        wallShapeLocal.lineTo(R_tile, 0);
        wallShapeLocal.lineTo(R_tile, -blockLength + t);
        wallShapeLocal.lineTo(-R_tile, -blockLength + t);
        wallShapeLocal.lineTo(-R_tile, 0);
        wallShapeLocal.lineTo(-R_base, 0);
      }
    }

    baseGeo = new ExtrudeGeometry(baseShapeLocal, {
      depth: floorDepth,
      steps: 1,
      bevelEnabled: false,
    });
    baseGeo.rotateX(-Math.PI / 2);

    tileGeo = new ExtrudeGeometry(tileShapeLocal, {
      depth: 0.02,
      steps: 1,
      bevelEnabled: false,
    });
    tileGeo.rotateX(-Math.PI / 2);
    tileGeo.translate(0, floorDepth, 0);

    leftWallGeo = new ExtrudeGeometry(wallShapeLocal, {
      depth: h - floorDepth,
      steps: 1,
      bevelEnabled: false,
    });
    leftWallGeo.rotateX(-Math.PI / 2);
    leftWallGeo.translate(0, floorDepth, 0);

    rightWallGeo = null;
    backWallGeo = null;

    previousGeos = [baseGeo, tileGeo, leftWallGeo].filter(Boolean);
  }

  function disposeGeometries() {
    if (previousGeos) {
      previousGeos.forEach((g) => g?.dispose());
      previousGeos = null;
    }
  }

  onDestroy(() => disposeGeometries());

  // Rebuild whenever inputs change
  $: if (shape && type) {
    buildGeometries(shape, type);
  }
  // Generate explicit convex hull colliders to avoid expensive trimeshes
  $: colliders = (() => {
    const segments = [];
    if (!shape || !type) return segments;

    const R_base = w + t; // 2.7
    const R_tile = w; // 2.5
    const y0_base = 0;
    const y1_base = floorDepth;
    const y0_tile = floorDepth;
    const y1_tile = floorDepth + 0.02;
    const y0_wall = floorDepth;
    const y1_wall = h;

    const addBox = (x0, x1, z0, z1, y0, y1) => {
      segments.push(new Float32Array([
        x0, y0, z0,  x1, y0, z0,  x0, y1, z0,  x1, y1, z0,
        x0, y0, z1,  x1, y0, z1,  x0, y1, z1,  x1, y1, z1,
      ]));
    };

    const addQuad = (p1, p2, p3, p4, y0, y1) => {
      segments.push(new Float32Array([
        p1.x, y0, p1.z,  p2.x, y0, p2.z,  p3.x, y0, p3.z,  p4.x, y0, p4.z,
        p1.x, y1, p1.z,  p2.x, y1, p2.z,  p3.x, y1, p3.z,  p4.x, y1, p4.z,
      ]));
    };

    const getPoint = (r, angle) => ({
      x: r * Math.cos(angle),
      z: -r * Math.sin(angle) // Note: shape.y maps to world.-z in our rotateX(-PI/2) convention
    });

    if (shape === "square") {
      if (type === "start") {
        addBox(-R_base, R_base, -blockLength, 0, y0_base, y1_base); // base
        addBox(-R_tile, R_tile, -blockLength + t, 0, y0_tile, y1_tile); // tile
        addBox(-R_base, -R_tile, -blockLength, 0, y0_wall, y1_wall); // left wall
        addBox(R_tile, R_base, -blockLength, 0, y0_wall, y1_wall); // right wall
        addBox(-R_tile, R_tile, -blockLength, -blockLength + t, y0_wall, y1_wall); // back wall
      } else {
        addBox(-R_base, R_base, 0, blockLength, y0_base, y1_base); // base
        addBox(-R_tile, R_tile, 0, blockLength - t, y0_tile, y1_tile); // tile
        addBox(-R_base, -R_tile, 0, blockLength, y0_wall, y1_wall); // left wall
        addBox(R_tile, R_base, 0, blockLength, y0_wall, y1_wall); // right wall
        addBox(-R_tile, R_tile, blockLength - t, blockLength, y0_wall, y1_wall); // back wall
      }
    } else if (shape === "rounded") {
      const numSegments = 12;
      const angleStart = type === "start" ? 0 : Math.PI;
      const angleEnd = type === "start" ? Math.PI : 2 * Math.PI;
      const angleStep = (angleEnd - angleStart) / numSegments;

      for (let i = 0; i < numSegments; i++) {
        const a1 = angleStart + i * angleStep;
        const a2 = angleStart + (i + 1) * angleStep;
        const origin = { x: 0, z: 0 };
        const b1 = getPoint(R_base, a1);
        const b2 = getPoint(R_base, a2);
        const t1 = getPoint(R_tile, a1);
        const t2 = getPoint(R_tile, a2);

        // For triangle wedges (base, tile), we can use a degenerate quad (p1=p4)
        addQuad(origin, b1, b2, origin, y0_base, y1_base); // base
        addQuad(origin, t1, t2, origin, y0_tile, y1_tile); // tile
        addQuad(t1, b1, b2, t2, y0_wall, y1_wall); // wall
      }
    }
    return segments;
  })();
</script>

{#if baseGeo}
  <RigidBody type="fixed">
    <T.Group {position} rotation={[euler.x, euler.y, euler.z]}>
      {#if baseGeo}
        <T.Mesh geometry={baseGeo} castShadow receiveShadow>
          <T.MeshStandardMaterial color="#888888" />
        </T.Mesh>
      {/if}
      {#if tileGeo}
        <T.Mesh geometry={tileGeo} castShadow receiveShadow>
          <T.MeshStandardMaterial color="#567D46" />
        </T.Mesh>
      {/if}
      {#if leftWallGeo}
        <T.Mesh geometry={leftWallGeo} castShadow receiveShadow>
          <T.MeshStandardMaterial color="#8B5A2B" />
        </T.Mesh>
      {/if}
      {#if rightWallGeo}
        <T.Mesh geometry={rightWallGeo} castShadow receiveShadow>
          <T.MeshStandardMaterial color="#8B5A2B" />
        </T.Mesh>
      {/if}
      {#if backWallGeo}
        <T.Mesh geometry={backWallGeo} castShadow receiveShadow>
          <T.MeshStandardMaterial color="#8B5A2B" />
        </T.Mesh>
      {/if}

      <!-- Explicit precise convex hull colliders -->
      {#each colliders as hullVertices}
        <Collider shape="convexHull" args={[hullVertices]} />
      {/each}

      <!-- Indicators -->
      {#if type === "start"}
        <T.Mesh
          position={[0, floorDepth + 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <T.CircleGeometry args={[0.4, 32]} />
          <T.MeshStandardMaterial color="#4ade80" />
        </T.Mesh>
      {:else}
        <!-- Hole indicator -->
        <T.Mesh
          position={[0, floorDepth + 0.02, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <T.CircleGeometry args={[0.4, 32]} />
          <T.MeshStandardMaterial color="#111111" />
        </T.Mesh>

        <!-- Flag pole -->
        <T.Mesh position={[0, floorDepth + 1.0, 0]} castShadow receiveShadow>
          <T.CylinderGeometry args={[0.02, 0.02, 2, 8]} />
          <T.MeshStandardMaterial color="#cccccc" />
        </T.Mesh>

        <!-- Flag -->
        <T.Mesh position={[0.3, floorDepth + 1.8, 0]} castShadow receiveShadow>
          <T.BoxGeometry args={[0.6, 0.3, 0.02]} />
          <T.MeshStandardMaterial color="#ef4444" />
        </T.Mesh>
      {/if}
    </T.Group>
  </RigidBody>
{/if}
