<script>
  import { T } from "@threlte/core";
  import { Shape, ExtrudeGeometry, Vector3, Quaternion, Euler } from "three";
  import { AutoColliders, Collider, RigidBody } from "@threlte/rapier";
  import { onDestroy } from "svelte";
  import { createMiterGeometry } from "$lib/trackGeometry";
  import WoodMaterial from "$lib/scene/materials/WoodMaterial.svelte";
  import TileMaterial from "$lib/scene/materials/TileMaterial.svelte";

  export let type = "start"; // 'start' or 'end'
  export let shape = "rounded"; // 'square' or 'rounded'
  export let position = [0, 0, 0];
  export let tangent = new Vector3(0, 0, 1); // direction the track is heading
  export let rotation = 0; // kept for back-compat but we use tangent now
  export let isEditor = false;

  export let groundFriction = 0.5;
  export let groundRestitution = 0.5;
  export let wallFriction = 0.5;
  export let wallRestitution = 0.5;
  export let tileColor = "#567D46";

  // Track cross-section dimensions (must match SplineTrack exactly)
  const w = 2.5; // half inner width
  const t = 0.5; // wall thickness
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
  let baseGeo, tileGeo, wallGeo;
  let previousGeos = null;
  let meshes = [];

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

    const zMult = currentType === "start" ? -1 : 1;
    const angleStart = currentType === "start" ? 0 : Math.PI;

    if (currentShape === "rounded") {
      baseShapeLocal.moveTo(-R_base * zMult, 0);
      baseShapeLocal.absarc(0, 0, R_base, angleStart, angleStart + Math.PI, false); // CCW
      baseShapeLocal.lineTo(-R_base * zMult, 0);

      tileShapeLocal.moveTo(-R_tile * zMult, 0);
      tileShapeLocal.absarc(0, 0, R_tile, angleStart, angleStart + Math.PI, false); // CCW
      tileShapeLocal.lineTo(-R_tile * zMult, 0);

      wallShapeLocal.moveTo(-R_base * zMult, 0);
      wallShapeLocal.absarc(0, 0, R_base, angleStart, angleStart + Math.PI, false); // CCW outer
      wallShapeLocal.lineTo(R_tile * zMult, 0); // inward
      wallShapeLocal.absarc(0, 0, R_tile, angleStart + Math.PI, angleStart, true); // CW inner
      wallShapeLocal.lineTo(-R_base * zMult, 0); // close
    } else {
      baseShapeLocal.moveTo(-R_base * zMult, 0);
      baseShapeLocal.lineTo(-R_base * zMult, -blockLength * zMult);
      baseShapeLocal.lineTo(R_base * zMult, -blockLength * zMult);
      baseShapeLocal.lineTo(R_base * zMult, 0);
      baseShapeLocal.lineTo(-R_base * zMult, 0);

      tileShapeLocal.moveTo(-R_tile * zMult, 0);
      tileShapeLocal.lineTo(-R_tile * zMult, (-blockLength + t) * zMult);
      tileShapeLocal.lineTo(R_tile * zMult, (-blockLength + t) * zMult);
      tileShapeLocal.lineTo(R_tile * zMult, 0);
      tileShapeLocal.lineTo(-R_tile * zMult, 0);

      wallShapeLocal.moveTo(-R_base * zMult, 0);
      wallShapeLocal.lineTo(-R_base * zMult, -blockLength * zMult);
      wallShapeLocal.lineTo(R_base * zMult, -blockLength * zMult);
      wallShapeLocal.lineTo(R_base * zMult, 0);
      wallShapeLocal.lineTo(R_tile * zMult, 0);
      wallShapeLocal.lineTo(R_tile * zMult, (-blockLength + t) * zMult);
      wallShapeLocal.lineTo(-R_tile * zMult, (-blockLength + t) * zMult);
      wallShapeLocal.lineTo(-R_tile * zMult, 0);
      wallShapeLocal.lineTo(-R_base * zMult, 0);
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

    wallGeo = new ExtrudeGeometry(wallShapeLocal, {
      depth: h - floorDepth,
      steps: 1,
      bevelEnabled: false,
    });
    wallGeo.rotateX(-Math.PI / 2);
    wallGeo.translate(0, floorDepth, 0);

    previousGeos = [baseGeo, tileGeo, wallGeo].filter(Boolean);
    meshes = [
      { geo: baseGeo, color: "#888888", meshType: "base" },
      { geo: tileGeo, color: tileColor, meshType: "tile" },
      { geo: wallGeo, color: "#8B5A2B", meshType: "wall" },
    ];
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
    const floorSegments = [];
    const wallSegments = [];
    if (!shape || !type) return { floor: floorSegments, wall: wallSegments };

    const R_base = w + t; // 2.7
    const R_tile = w; // 2.5
    const y0_base = 0;
    const y1_base = floorDepth;
    const y0_tile = floorDepth;
    const y1_tile = floorDepth + 0.02;
    const y0_wall = floorDepth;
    const y1_wall = h;

    const addBox = (target, x0, x1, z0, z1, y0, y1) => {
      target.push(new Float32Array([
        x0, y0, z0,  x1, y0, z0,  x0, y1, z0,  x1, y1, z0,
        x0, y0, z1,  x1, y0, z1,  x0, y1, z1,  x1, y1, z1,
      ]));
    };

    const addQuad = (target, p1, p2, p3, p4, y0, y1) => {
      target.push(new Float32Array([
        p1.x, y0, p1.z,  p2.x, y0, p2.z,  p3.x, y0, p3.z,  p4.x, y0, p4.z,
        p1.x, y1, p1.z,  p2.x, y1, p2.z,  p3.x, y1, p3.z,  p4.x, y1, p4.z,
      ]));
    };

    const getPoint = (r, angle) => ({
      x: r * Math.cos(angle),
      z: -r * Math.sin(angle) // Note: shape.y maps to world.-z in our rotateX(-PI/2) convention
    });

    const zMult = type === "start" ? -1 : 1;

    if (shape === "square") {
      const z0 = Math.min(0, blockLength * zMult);
      const z1 = Math.max(0, blockLength * zMult);
      const zTile0 = Math.min(0, (blockLength - t) * zMult);
      const zTile1 = Math.max(0, (blockLength - t) * zMult);
      const zBack0 = zMult === -1 ? -blockLength : blockLength - t;
      const zBack1 = zMult === -1 ? -blockLength + t : blockLength;

      addBox(floorSegments, -R_base, R_base, z0, z1, y0_base, y1_base); // base
      addBox(floorSegments, -R_tile, R_tile, zTile0, zTile1, y0_tile, y1_tile); // tile
      addBox(wallSegments, -R_base, -R_tile, z0, z1, y0_wall, y1_wall); // left wall
      addBox(wallSegments, R_tile, R_base, z0, z1, y0_wall, y1_wall); // right wall
      addBox(wallSegments, -R_tile, R_tile, zBack0, zBack1, y0_wall, y1_wall); // back wall
    } else if (shape === "rounded") {
      const numSegments = 12;
      const angleStart = type === "start" ? 0 : Math.PI;
      const angleEnd = angleStart + Math.PI;
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
        addQuad(floorSegments, origin, b1, b2, origin, y0_base, y1_base); // base
        addQuad(floorSegments, origin, t1, t2, origin, y0_tile, y1_tile); // tile
        addQuad(wallSegments, t1, b1, b2, t2, y0_wall, y1_wall); // wall
      }
    }
    return { floor: floorSegments, wall: wallSegments };
  })();
</script>

{#if baseGeo}
  <RigidBody type="fixed">
    <T.Group {position} rotation={[euler.x, euler.y, euler.z]}>
      {#each meshes as {geo, color, meshType}}
        <T.Mesh geometry={geo} castShadow receiveShadow>
          {#if meshType === "wall"}
            <WoodMaterial {color} />
          {:else if meshType === "tile"}
            <TileMaterial {color} />
          {:else}
            <T.MeshStandardMaterial {color} />
          {/if}
        </T.Mesh>
      {/each}

      <!-- Explicit precise convex hull colliders -->
      {#each colliders.floor as hullVertices}
        <!-- Floor is strictly in Group 1 -->
        <Collider shape="convexHull" args={[hullVertices]} friction={wallFriction} restitution={wallRestitution} collisionGroups={0x0001FFFF} />
      {/each}
      {#each colliders.wall as hullVertices}
        <!-- Walls are in collision group 2 -->
        <Collider shape="convexHull" args={[hullVertices]} friction={wallFriction} restitution={wallRestitution} collisionGroups={0x0002FFFF} />
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
