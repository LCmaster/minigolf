<script>
  import {
    Shape,
    Vector3,
    Matrix4,
    Quaternion,
    Euler,
    DoubleSide,
  } from "three";
  import { onDestroy } from "svelte";
  import { T } from "@threlte/core";
  import { AutoColliders, Collider, RigidBody } from "@threlte/rapier";
  import TrackBlock from "$lib/scene/blocks/TrackBlock.svelte";
  import { createMiterGeometry, createSegmentHull, computeMiterPathData } from "$lib/trackGeometry";


  export let controlPoints = [];
  export let isEditor = false;
  export let isPreview = false;

  // No physics needed in both editor and preview modes
  $: noPhysics = isEditor || isPreview;

  // Kept outside of any reactive block so that writing to it does NOT
  // re-trigger the reactive geometry builder (which was causing an infinite loop).
  let previousGeometry = null;

  // Base shape: spans full width, height 0 to -0.1
  const baseShape = (() => {
    const s = new Shape();
    const w = 2.5;
    const t = 0.2;
    s.moveTo(0, -w - t);
    s.lineTo(0, w + t);
    s.lineTo(-0.1, w + t);
    s.lineTo(-0.1, -w - t);
    s.lineTo(0, -w - t);
    return s;
  })();

  // Tile shape: the green felt, spans inner width, height -0.1 to -0.12
  const tileShape = (() => {
    const s = new Shape();
    const w = 2.5;
    s.moveTo(-0.1, -w);
    s.lineTo(-0.1, w);
    s.lineTo(-0.12, w);
    s.lineTo(-0.12, -w);
    s.lineTo(-0.1, -w);
    return s;
  })();

  // Walls shape: the two side walls, height -0.1 to -0.5
  const wallsShape = (() => {
    const s = new Shape();
    const w = 2.5;
    const h = 0.5;
    const t = 0.2;
    // Left wall
    s.moveTo(-0.1, w);
    s.lineTo(-0.1, w + t);
    s.lineTo(-h, w + t);
    s.lineTo(-h, w);
    s.lineTo(-0.1, w);
    return s;
  })();

  const rightWallShape = (() => {
    const s = new Shape();
    const w = 2.5;
    const h = 0.5;
    const t = 0.2;
    s.moveTo(-0.1, -w - t);
    s.lineTo(-0.1, -w);
    s.lineTo(-h, -w);
    s.lineTo(-h, -w - t);
    s.lineTo(-0.1, -w - t);
    return s;
  })();

  let baseGeo = null;
  let tileGeo = null;
  let leftWallGeo = null;
  let rightWallGeo = null;

  $: {
    disposeGeometry();
    if (controlPoints.length > 1) {
      const pts = controlPoints.map((p) => new Vector3(...p.position));
      const pathData = computeMiterPathData(pts);
      baseGeo = createMiterGeometry(baseShape, pathData);
      tileGeo = createMiterGeometry(tileShape, pathData);
      leftWallGeo = createMiterGeometry(wallsShape, pathData);
      rightWallGeo = createMiterGeometry(rightWallShape, pathData);

      // store in previousGeometry to dispose later
      previousGeometry = [baseGeo, tileGeo, leftWallGeo, rightWallGeo];
    } else {
      baseGeo = tileGeo = leftWallGeo = rightWallGeo = null;
      previousGeometry = null;
    }
  }

  function disposeGeometry() {
    if (previousGeometry) {
      if (Array.isArray(previousGeometry)) {
        previousGeometry.forEach((g) => g?.dispose());
      } else {
        previousGeometry.dispose();
      }
      previousGeometry = null;
    }
  }

  onDestroy(() => disposeGeometry());

  $: startPos =
    controlPoints.length > 0 ? controlPoints[0].position : [0, 0, 0];
  $: endPos =
    controlPoints.length > 0
      ? controlPoints[controlPoints.length - 1].position
      : [0, 0, 0];

  $: startTangent =
    controlPoints.length > 1
      ? new Vector3()
          .subVectors(
            new Vector3(...controlPoints[1].position),
            new Vector3(...controlPoints[0].position),
          )
          .normalize()
      : new Vector3(0, 0, 1);
  $: endTangent =
    controlPoints.length > 1
      ? new Vector3()
          .subVectors(
            new Vector3(...controlPoints[controlPoints.length - 1].position),
            new Vector3(...controlPoints[controlPoints.length - 2].position),
          )
          .normalize()
      : new Vector3(0, 0, 1);

  // Wall geometry constants (must match the Shape definitions above)
  const WALL_W = 2.5; // half-width of track surface
  const WALL_H = 0.5; // total wall height (Y goes from -0.1 to -0.5 in shape space)
  const WALL_T = 0.2; // wall thickness
  // In world space (shape.x → -U, shape.y → -R):
  //   vertical center = (0.1 + 0.5) / 2 = 0.3  (along +U)
  //   lateral center  = ±(w + t/2) = ±2.6       (along ±R)
  const WALL_U_CENTER = (0.1 + WALL_H) / 2; // 0.3
  const WALL_HALF_H = (WALL_H - 0.1) / 2; // 0.2
  const WALL_HALF_T = WALL_T / 2; // 0.1
  const WALL_R_OFFSET = WALL_W + WALL_T / 2; // 2.6

  // Per-segment exact convex hull colliders
  $: colliders = (() => {
    if (controlPoints.length < 2) return [];
    const pts = controlPoints.map((p) => new Vector3(...p.position));
    const segments = [];

    const pointData = computeMiterPathData(pts);

    for (let i = 0; i < pts.length - 1; i++) {
      const d0 = pointData[i];
      const d1 = pointData[i + 1];

      // Add exact convex hulls for wall segments only
      // (base and tile use a single trimesh to avoid seam-jumping)
      segments.push(createSegmentHull(wallsShape, d0, d1));
      segments.push(createSegmentHull(rightWallShape, d0, d1));
    }

    return segments;
  })();
</script>

{#if baseGeo}
  <!-- Visual meshes (always rendered regardless of physics mode) -->
  <T.Group>
    <T.Mesh geometry={baseGeo} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#888888" side={DoubleSide} />
    </T.Mesh>
    <T.Mesh geometry={tileGeo} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#567D46" side={DoubleSide} />
    </T.Mesh>
    <T.Mesh geometry={leftWallGeo} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#8B5A2B" side={DoubleSide} />
    </T.Mesh>
    <T.Mesh geometry={rightWallGeo} castShadow receiveShadow>
      <T.MeshStandardMaterial color="#8B5A2B" side={DoubleSide} />
    </T.Mesh>
  </T.Group>

  <!-- Physics collider (only in gameplay/test mode) -->
  <!-- {#if !noPhysics} -->
  <RigidBody type="fixed">
    <!-- Floor colliders: single trimesh for seamless rolling -->
    <AutoColliders shape="trimesh">
      <T.Mesh geometry={baseGeo} castShadow receiveShadow>
        <T.MeshStandardMaterial color="#888888" side={DoubleSide} />
      </T.Mesh>
      <T.Mesh geometry={tileGeo} castShadow receiveShadow>
        <T.MeshStandardMaterial color="#567D46" side={DoubleSide} />
      </T.Mesh>
    </AutoColliders>
    <!-- Per-segment exact convex hull colliders -->
    {#each colliders as hullVertices}
      <Collider shape="convexHull" args={[hullVertices]} />
    {/each}
  </RigidBody>
  <!-- {/if} -->
{/if}

{#if controlPoints.length > 0}
  <TrackBlock
    type="start"
    shape={controlPoints[0].shape || "round"}
    position={startPos}
    tangent={startTangent}
    isEditor={noPhysics}
  />
{/if}

{#if controlPoints.length > 0}
  <TrackBlock
    type="end"
    shape={controlPoints[controlPoints.length - 1].shape || "round"}
    position={endPos}
    tangent={endTangent}
    isEditor={noPhysics}
  />
{/if}
