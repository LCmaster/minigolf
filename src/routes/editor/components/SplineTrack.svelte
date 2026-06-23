<script>
  import {
    Shape,
    Vector3,
    Matrix4,
    Quaternion,
    Euler,
  } from "three";
  import { onDestroy } from "svelte";
  import { T } from "@threlte/core";
  import { AutoColliders, Collider, RigidBody } from "@threlte/rapier";
  import TrackBlock from "$lib/scene/blocks/TrackBlock.svelte";
  import WoodMaterial from "$lib/scene/materials/WoodMaterial.svelte";
  import TileMaterial from "$lib/scene/materials/TileMaterial.svelte";
  import { createMiterGeometry, createSegmentHull, computeMiterPathData } from "$lib/trackGeometry";
  import { useEditor } from "../context";
  import { snapToHex } from "$lib/gridUtils";

  const { placementBlock, previewPosition, blocks, blockSelected } = useEditor();


  export let controlPoints = [];
  export let isEditor = false;
  export let isPreview = false;

  export let groundFriction = 0.5;
  export let groundRestitution = 0.5;
  export let wallFriction = 0.5;
  export let wallRestitution = 0.5;
  
  export let tileColor = "#567D46";

  // No physics needed in both editor and preview modes
  $: noPhysics = isEditor || isPreview;

  // Kept outside of any reactive block so that writing to it does NOT
  // re-trigger the reactive geometry builder (which was causing an infinite loop).
  let previousGeometry = null;

  // Base shape: spans full width, height 0 to -0.1
  const baseShape = (() => {
    const s = new Shape();
    const w = 2.5;
    const t = 0.5;
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
    s.moveTo(-0.1, w);
    s.lineTo(-0.1, -w);
    s.lineTo(-0.12, -w);
    s.lineTo(-0.12, w);
    s.lineTo(-0.1, w);
    return s;
  })();

  // Left wall shape: height -0.1 to -0.5
  const leftWallShape = (() => {
    const s = new Shape();
    const w = 2.5;
    const h = 0.5;
    const t = 0.5;
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
    const t = 0.5;
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
  let wallMeshes = [];

  $: updateGeometry(controlPoints);

  function updateGeometry(points) {
    disposeGeometry();
    if (points.length > 1) {
      const pts = points.map((p) => new Vector3(...p.position));
      const pathData = computeMiterPathData(pts);
      
      const bGeo = createMiterGeometry(baseShape, pathData);
      const tGeo = createMiterGeometry(tileShape, pathData);
      const lwGeo = createMiterGeometry(leftWallShape, pathData);
      const rwGeo = createMiterGeometry(rightWallShape, pathData);

      baseGeo = bGeo;
      tileGeo = tGeo;
      leftWallGeo = lwGeo;
      rightWallGeo = rwGeo;

      wallMeshes = [
        { geo: lwGeo, color: "#8B5A2B" },
        { geo: rwGeo, color: "#8B5A2B" },
      ];

      // store in previousGeometry to dispose later
      previousGeometry = [bGeo, tGeo, lwGeo, rwGeo];
    } else {
      baseGeo = tileGeo = leftWallGeo = rightWallGeo = null;
      wallMeshes = [];
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

  $: startTangent = (() => {
    if (controlPoints.length < 2) return new Vector3(0, 0, 1);
    const v = new Vector3().subVectors(
      new Vector3(...controlPoints[1].position),
      new Vector3(...controlPoints[0].position),
    );
    return v.lengthSq() > 0.0001 ? v.normalize() : new Vector3(0, 0, 1);
  })();

  $: endTangent = (() => {
    if (controlPoints.length < 2) return new Vector3(0, 0, 1);
    const v = new Vector3().subVectors(
      new Vector3(...controlPoints[controlPoints.length - 1].position),
      new Vector3(...controlPoints[controlPoints.length - 2].position),
    );
    return v.lengthSq() > 0.0001 ? v.normalize() : new Vector3(0, 0, 1);
  })();

  // (Dead WALL constants removed during refactor)

  let colliders = [];

  $: updateColliders(controlPoints);

  function updateColliders(points) {
    if (points.length < 2) {
      colliders = [];
      return;
    }
    const pts = points.map((p) => new Vector3(...p.position));
    const segments = [];

    const pointData = computeMiterPathData(pts);

    for (let i = 0; i < pts.length - 1; i++) {
      const d0 = pointData[i];
      const d1 = pointData[i + 1];

      // Add exact convex hulls for wall segments only
      // (base and tile use a single trimesh to avoid seam-jumping)
      segments.push(createSegmentHull(leftWallShape, d0, d1));
      segments.push(createSegmentHull(rightWallShape, d0, d1));
    }

    colliders = segments;
  }

  function handlePointerMove(e) {
    if ($placementBlock) {
      e.stopPropagation();
      const snapped = snapToHex(e.point.x, e.point.z);
      $previewPosition = [snapped.x, e.point.y, snapped.z];
    }
  }

  function handleClick(e) {
    if ($placementBlock) {
      e.stopPropagation();
      const snapped = snapToHex(e.point.x, e.point.z);

      const newBlock = {
        id: crypto.randomUUID(),
        type: $placementBlock.type,
        variation: $placementBlock.variation,
        position: [snapped.x, e.point.y, snapped.z],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      };
      if (newBlock.type === "bumper") newBlock.restitution = 2.0;
      if (newBlock.type === "boost") newBlock.boostForce = 15;

      blocks.commit();
      $blocks = [...$blocks, newBlock];
      $blockSelected = newBlock.id;
      
      $placementBlock = null;
    }
  }
</script>

{#if baseGeo}
  <!-- Visual meshes -->
  <T.Group>
    <!-- Render floor visual meshes only if physics is disabled (to avoid duplicating AutoColliders rendering) -->
    {#if noPhysics}
      <T.Mesh geometry={baseGeo} receiveShadow on:pointermove={handlePointerMove} on:click={handleClick}>
        <T.MeshStandardMaterial color="#888888" />
      </T.Mesh>
      <T.Mesh geometry={tileGeo} receiveShadow on:pointermove={handlePointerMove} on:click={handleClick}>
        <TileMaterial color={tileColor} />
      </T.Mesh>
    {/if}

    {#each wallMeshes as { geo, color }}
      <T.Mesh geometry={geo} castShadow receiveShadow>
        <WoodMaterial {color} />
      </T.Mesh>
    {/each}
  </T.Group>

  <!-- Physics collider (only in gameplay/test mode) -->
  {#if !noPhysics}
  <RigidBody type="fixed">
    <!-- Floor colliders: single trimesh for seamless rolling -->
    <AutoColliders shape="trimesh" friction={groundFriction} restitution={groundRestitution}>
      <T.Mesh geometry={baseGeo} receiveShadow>
        <T.MeshStandardMaterial color="#888888" />
      </T.Mesh>
      <T.Mesh geometry={tileGeo} receiveShadow>
        <TileMaterial color={tileColor} />
      </T.Mesh>
    </AutoColliders>
    <!-- Per-segment exact convex hull colliders -->
    {#each colliders as hullVertices}
      <Collider shape="convexHull" args={[hullVertices]} friction={wallFriction} restitution={wallRestitution} />
    {/each}
  </RigidBody>
  {/if}
{/if}

{#if controlPoints.length > 0}
  <TrackBlock
    type="start"
    shape={controlPoints[0].shape || "rounded"}
    position={startPos}
    tangent={startTangent}
    isEditor={noPhysics}
    {groundFriction}
    {groundRestitution}
    {wallFriction}
    {wallRestitution}
    {tileColor}
  />
{/if}

{#if controlPoints.length > 0}
  <TrackBlock
    type="end"
    shape={controlPoints[controlPoints.length - 1].shape || "rounded"}
    position={endPos}
    tangent={endTangent}
    isEditor={noPhysics}
    {groundFriction}
    {groundRestitution}
    {wallFriction}
    {wallRestitution}
    {tileColor}
  />
{/if}
