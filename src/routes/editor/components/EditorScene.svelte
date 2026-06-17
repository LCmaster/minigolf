<script>
  import { T } from "@threlte/core";
  import {
    interactivity,
    OrbitControls,
    TransformControls,
  } from "@threlte/extras";
  import SplineTrack from "./SplineTrack.svelte";
  import EditorFloor from "./EditorFloor.svelte";

  import { useEditor } from "../context";

  const { controlPoints, pointSelected, pointColors } = useEditor();

  interactivity();

  // Mesh refs keyed by point id, used by TransformControls.
  // Do NOT reset reactively — {#key} remount re-fires bind:ref automatically.
  let meshRefs = {};

  // Clear selection when the full set of IDs changes (e.g. random generation).
  let prevIds = $controlPoints.map((p) => p.id).join(",");
  $: {
    const currentIds = $controlPoints.map((p) => p.id).join(",");
    if (currentIds !== prevIds) {
      prevIds = currentIds;
      $pointSelected = null;
    }
  }

  // Drives {#key} so all sphere meshes are fully remounted on ID change.
  $: pointIds = $controlPoints.map((p) => p.id).join(",");

  function selectPoint(id) {
    $pointSelected = id;
  }

  function onTransformChange(e, i) {
    const pos = e.target.object.position;
    $controlPoints[i].position = [pos.x, pos.y, pos.z];
    $controlPoints = [...$controlPoints];
  }

  $: colors = $pointColors;
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

{#key pointIds}
  {#each $controlPoints as point, i (point.id)}
    <!-- Sphere mesh first — bind:ref must fire before TransformControls mounts -->
    <T.Mesh
      position={[point.position[0], point.position[1] + 1.5, point.position[2]]}
      bind:ref={meshRefs[point.id]}
      on:click={(e) => {
        e.stopPropagation();
        if (i === 0) return; // Start point is locked
        selectPoint(point.id);
      }}
      on:pointerenter={(e) => {
        if (i === 0) return;
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
{/key}

<EditorFloor />

<SplineTrack controlPoints={$controlPoints} isEditor={true} />
