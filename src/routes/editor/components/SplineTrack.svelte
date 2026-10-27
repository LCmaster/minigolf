<script>
  import { Shape, Vector3 } from "three";
  import { onDestroy } from "svelte";
  import { T } from "@threlte/core";
  import { AutoColliders, Collider, RigidBody } from "@threlte/rapier";
  import TrackBlock from "$lib/scene/blocks/TrackBlock.svelte";
  import WoodMaterial from "$lib/scene/materials/WoodMaterial.svelte";
  import TileMaterial from "$lib/scene/materials/TileMaterial.svelte";
  import HeightmapMaterial from "$lib/scene/materials/HeightmapMaterial.svelte";
  import {
    createMiterGeometry,
    createSegmentHull,
    computeMiterPathData,
  } from "$lib/trackGeometry";
  import { generateCourseHeightmap } from "$lib/heightmapGeometry";
  import { useEditor } from "../context";
  import { writable } from "svelte/store";

  const editorContext = useEditor();
  const dummyStore = writable(null);
  const placementBlock = editorContext?.placementBlock || dummyStore;
  const previewPosition = editorContext?.previewPosition || dummyStore;
  const previewRotation = editorContext?.previewRotation || writable([0, 0, 0]);
  const blocks = editorContext?.blocks || dummyStore;
  const blockSelected = editorContext?.blockSelected || dummyStore;
  const editorControlPoints = editorContext?.controlPoints || dummyStore;
  const pointSelected = editorContext?.pointSelected || dummyStore;

  export let controlPoints = [];
  export let isEditor = false;
  export let isPreview = false;
  export let terrainMode = "heightmap"; // "heightmap" | "classic"

  export let groundFriction = 0.5;
  export let groundRestitution = 0.05;
  export let wallFriction = 0.5;
  export let wallRestitution = 0.5;
  export let tileColor = "#567D46";

  // No physics needed in both editor and preview modes
  $: noPhysics = isEditor || isPreview;

  let previousGeometry = null;

  // Course Track cross-section shapes (width & banking are applied dynamically per-vertex in trackGeometry.js)
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

  const leftWallShape = (() => {
    const s = new Shape();
    const w = 2.5;
    const h = 0.5;
    const t = 0.5;
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
  let wallMeshes = [];
  let colliders = [];

  // Heightmap Terrain underneath the Course Track
  let heightmapVisualGeo = null;

  $: updateGeometry(controlPoints, terrainMode);

  function updateGeometry(points, mode) {
    disposeGeometry();

    if (!points || points.length < 2) {
      baseGeo = tileGeo = null;
      wallMeshes = [];
      colliders = [];
      heightmapVisualGeo = null;
      previousGeometry = null;
      return;
    }

    // 1. Always build the Course Track (with per-point width, bankAngle, and wall toggles)
    const pts = points.map((p) => new Vector3(...p.position));
    const pathData = computeMiterPathData(pts, points);

    const bGeo = createMiterGeometry(baseShape, pathData, { wallSide: "base" });
    const tGeo = createMiterGeometry(tileShape, pathData);
    const lwGeo = createMiterGeometry(leftWallShape, pathData, { wallSide: "left" });
    const rwGeo = createMiterGeometry(rightWallShape, pathData, { wallSide: "right" });

    baseGeo = bGeo;
    tileGeo = tGeo;
    wallMeshes = [
      ...(lwGeo.attributes.position ? [{ geo: lwGeo, color: "#8B5A2B" }] : []),
      ...(rwGeo.attributes.position ? [{ geo: rwGeo, color: "#8B5A2B" }] : []),
    ];

    const segments = [];
    for (let i = 0; i < pathData.length - 1; i++) {
      const d0 = pathData[i];
      const d1 = pathData[i + 1];
      if (d0.leftWall !== false) {
        segments.push(createSegmentHull(leftWallShape, d0, d1));
      }
      if (d0.rightWall !== false) {
        segments.push(createSegmentHull(rightWallShape, d0, d1));
      }
    }
    colliders = segments;

    const toDispose = [bGeo, tGeo, lwGeo, rwGeo];

    // 2. Build the sculpted Heightmap Terrain underneath the Course Track
    if (mode !== "classic") {
      const { visualGeo } = generateCourseHeightmap(points);
      heightmapVisualGeo = visualGeo;
      toDispose.push(visualGeo);
    } else {
      heightmapVisualGeo = null;
    }

    previousGeometry = toDispose;
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

  $: startPoint = controlPoints.length > 0 ? controlPoints[0] : null;
  $: endPoint =
    controlPoints.length > 0 ? controlPoints[controlPoints.length - 1] : null;
  $: startPos = startPoint ? startPoint.position : [0, 0, 0];
  $: endPos = endPoint ? endPoint.position : [0, 0, 0];

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

  const DOUBLE_CLICK_MS = 300;
  let lastClickTime = 0;
  let lastClickPt = null;

  function computePlacementCoords(e) {
    const isShift = e.nativeEvent?.shiftKey;
    const x = isShift
      ? Math.round(e.point.x * 2) / 2
      : Math.round(e.point.x * 20) / 20;
    const y = Math.round(e.point.y * 20) / 20;
    const z = isShift
      ? Math.round(e.point.z * 2) / 2
      : Math.round(e.point.z * 20) / 20;
    return [x, y, z];
  }

  function handlePointerMove(e) {
    if (!isEditor) return;
    if ($placementBlock) {
      e.stopPropagation();
      $previewPosition = computePlacementCoords(e);
    }
  }

  function handleClick(e) {
    if (!isEditor) return;
    e.stopPropagation();

    if ($placementBlock) {
      const coords = computePlacementCoords(e);
      const rot = $previewRotation || [0, 0, 0];

      const newBlock = {
        id: crypto.randomUUID(),
        type: $placementBlock.type,
        variation: $placementBlock.variation,
        position: coords,
        rotation: [...rot],
        scale: [1, 1, 1],
      };
      if (newBlock.type === "bumper") newBlock.restitution = 2.0;
      if (newBlock.type === "boost") newBlock.boostForce = 15;

      blocks.commit();
      $blocks = [...$blocks, newBlock];
      $blockSelected = newBlock.id;
      $pointSelected = null;

      if (!e.nativeEvent?.shiftKey) {
        $placementBlock = null;
      }
      return;
    }

    // Check for double-click on terrain/track to place a new Control Point on top of the terrain
    const now = Date.now();
    const dist = lastClickPt
      ? Math.hypot(e.point.x - lastClickPt.x, e.point.z - lastClickPt.z)
      : Infinity;

    if (now - lastClickTime < DOUBLE_CLICK_MS && dist < 2.0) {
      lastClickTime = 0;
      lastClickPt = null;

      if (editorControlPoints?.commit) {
        editorControlPoints.commit();
        const newId = crypto.randomUUID();
        const lastPt =
          $editorControlPoints[$editorControlPoints.length - 1];
        const newPt = {
          id: newId,
          position: [
            Math.round(e.point.x * 10) / 10,
            Math.round(e.point.y * 10) / 10,
            Math.round(e.point.z * 10) / 10,
          ],
          width: lastPt?.width ?? 2.5,
          bankAngle: 0,
        };
        $editorControlPoints = [...$editorControlPoints, newPt];
        $pointSelected = newId;
        $blockSelected = null;
      }
    } else {
      lastClickTime = now;
      lastClickPt = { x: e.point.x, z: e.point.z };
      $pointSelected = null;
      $blockSelected = null;
    }
  }
</script>

<!-- 1. Sculpted Heightmap Terrain (underneath the Course Track) -->
{#if heightmapVisualGeo}
  <T.Mesh
    geometry={heightmapVisualGeo}
    receiveShadow
    userData={{ isScenery: true }}
    on:pointermove={handlePointerMove}
    on:click={handleClick}
  >
    <HeightmapMaterial color="#4d7c0f" />
  </T.Mesh>
{/if}

<!-- 2. Course Track ON TOP of the Terrain -->
{#if baseGeo}
  <T.Group>
    {#if noPhysics}
      <T.Mesh
        geometry={baseGeo}
        receiveShadow
        on:pointermove={handlePointerMove}
        on:click={handleClick}
      >
        <T.MeshStandardMaterial color="#888888" />
      </T.Mesh>
      <T.Mesh
        geometry={tileGeo}
        receiveShadow
        on:pointermove={handlePointerMove}
        on:click={handleClick}
      >
        <TileMaterial color={tileColor} />
      </T.Mesh>
    {/if}

    {#each wallMeshes as { geo, color }}
      <T.Mesh geometry={geo} castShadow receiveShadow>
        <WoodMaterial {color} />
      </T.Mesh>
    {/each}
  </T.Group>

  {#if !noPhysics}
    <RigidBody type="fixed">
      <AutoColliders
        shape="trimesh"
        friction={groundFriction}
        restitution={groundRestitution}
        collisionGroups={0x0001ffff}
      >
        <T.Mesh geometry={baseGeo} receiveShadow>
          <T.MeshStandardMaterial color="#888888" />
        </T.Mesh>
        <T.Mesh geometry={tileGeo} receiveShadow>
          <TileMaterial color={tileColor} />
        </T.Mesh>
      </AutoColliders>
      {#each colliders as hullVertices}
        <Collider
          shape="convexHull"
          args={[hullVertices]}
          friction={wallFriction}
          restitution={wallRestitution}
          collisionGroups={0x0002ffff}
        />
      {/each}
    </RigidBody>
  {/if}
{/if}

{#if controlPoints.length > 0}
  <TrackBlock
    type="start"
    shape={startPoint?.shape || "rounded"}
    width={startPoint?.width ?? 2.5}
    bankAngle={startPoint?.bankAngle ?? 0}
    position={startPos}
    tangent={startTangent}
    isEditor={noPhysics}
    {groundFriction}
    {groundRestitution}
    {wallFriction}
    {wallRestitution}
    {tileColor}
  />
  <TrackBlock
    type="end"
    shape={endPoint?.shape || "rounded"}
    width={endPoint?.width ?? 2.5}
    bankAngle={endPoint?.bankAngle ?? 0}
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
