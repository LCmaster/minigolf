<script>
  import { T } from "@threlte/core";
  import {
    interactivity,
    OrbitControls,
    TransformControls,
    useTexture,
  } from "@threlte/extras";
  import { RepeatWrapping } from "three";
  import SplineTrack from "./SplineTrack.svelte";

  import { useEditor } from "../context";

  const { controlPoints, pointSelected, pointColors } = useEditor();

  interactivity();

  // Mesh refs keyed by point id, used by TransformControls
  let meshRefs = {};

  function selectPoint(id) {
    $pointSelected = id;
  }

  function deselectPoint() {
    $pointSelected = null;
  }

  function onTransformChange(e, i) {
    const pos = e.target.object.position;
    $controlPoints[i].position = [pos.x, 0, pos.z];
    $controlPoints = [...$controlPoints];
  }

  $: colors = $pointColors;

  $: texture = useTexture("/low_poly_grass.png");
  $: if ($texture) {
    $texture.wrapS = RepeatWrapping;
    $texture.wrapT = RepeatWrapping;
    $texture.repeat.set(100, 100);
  }

  // Double-click detection for the floor (Threlte doesn't forward native dblclick)
  let lastFloorClickTime = 0;
  const DOUBLE_CLICK_MS = 300;
</script>

<T.AmbientLight color="#ffffff" intensity={1} />
<T.DirectionalLight
  color="#ffffff"
  intensity={2}
  position={[10, 10, 10]}
  castShadow
/>
<T.PerspectiveCamera
  makeDefault
  fov={70}
  on:create={({ ref }) => {
    ref.position.set(5, 15, 15);
    ref.lookAt(0, 0, 0);
  }}
>
  <OrbitControls />
</T.PerspectiveCamera>

{#each $controlPoints as point, i (point.id)}
  <!-- TransformControls only attaches when the point is selected and mesh ref is ready -->
  {#if $pointSelected === point.id && meshRefs[point.id]}
    <TransformControls
      object={meshRefs[point.id]}
      mode="translate"
      showY={false}
      on:mouseDown={() => {}}
      on:change={(e) => onTransformChange(e, i)}
      on:mouseUp={() => {
        // Sync final position after dragging
        const mesh = meshRefs[point.id];
        if (mesh) {
          $controlPoints[i].position = [mesh.position.x, 0, mesh.position.z];
          $controlPoints = [...$controlPoints];
        }
      }}
    />
  {/if}
  <!-- Each sphere renders at elevated Y so it's above the track mesh -->
  <T.Mesh
    position={[point.position[0], 1.5, point.position[2]]}
    bind:ref={meshRefs[point.id]}
    on:pointerup={(e) => {
      e.stopPropagation();
      if (i === 0) return; // Start point is locked
      selectPoint(point.id);
    }}
    on:click={(e) => {
      e.stopPropagation();
    }}
    on:pointerenter={(e) => {
      if (i === 0) return; // No hover feedback for the start point
      e.object.material.color.set(
        point.id === $pointSelected ? colors.selectedHover : colors.hover,
      );
    }}
    on:pointerleave={(e) => {
      if (i === 0) return;
      e.object.material.color.set(
        point.id === $pointSelected ? colors.selected : colors.normal,
      );
    }}
  >
    <T.SphereGeometry args={[0.6, 16, 16]} />
    <T.MeshBasicMaterial
      color={i === 0
        ? "#22c55e"
        : point.id === $pointSelected
          ? colors.selected
          : colors.normal}
      depthTest={false}
      transparent={true}
      opacity={0.85}
    />
  </T.Mesh>
{/each}

<SplineTrack controlPoints={$controlPoints} />
<!-- Floor: double-click to add a new point, single click to deselect -->
<T.Mesh
  position={[0, -0.05, 0]}
  on:click={(e) => {
    const now = Date.now();
    const isDoubleClick = now - lastFloorClickTime < DOUBLE_CLICK_MS;
    lastFloorClickTime = now;

    if (isDoubleClick) {
      console.log("double clicked");
      // Double-click: add a new control point
      controlPoints.commit();
      const newId = crypto.randomUUID();
      $controlPoints = [
        ...$controlPoints,
        { id: newId, position: [e.point.x, 0, e.point.z] },
      ];
      $pointSelected = newId;
    }
  }}
>
  <T.BoxGeometry args={[1000, 0.1, 1000]} />
  {#if $texture}
    <T.MeshStandardMaterial map={$texture} color={"#ffffff"} />
  {:else}
    <T.MeshBasicMaterial color={"#567D46"} />
  {/if}
</T.Mesh>
