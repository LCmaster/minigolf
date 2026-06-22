<script>
  import { T } from "@threlte/core";
  import {
    interactivity,
    OrbitControls,
    TransformControls,
    Suspense
  } from "@threlte/extras";
  import SplineTrack from "./SplineTrack.svelte";
  import EditorFloor from "./EditorFloor.svelte";
  import Bumper from "$lib/scene/obstacles/Bumper.svelte";
  import BoostPad from "$lib/scene/obstacles/BoostPad.svelte";
  import RampBlock from "$lib/scene/blocks/RampBlock.svelte";
  import LoopBlock from "$lib/scene/blocks/LoopBlock.svelte";
  import HalfPipeBlock from "$lib/scene/blocks/HalfPipeBlock.svelte";
  import IcePatch from "$lib/scene/obstacles/IcePatch.svelte";
  import SandTrap from "$lib/scene/obstacles/SandTrap.svelte";
  import WaterHazard from "$lib/scene/obstacles/WaterHazard.svelte";
  import PlinkoPegs from "$lib/scene/obstacles/PlinkoPegs.svelte";
  import { useEditor } from "../context";

  const { controlPoints, pointSelected, pointColors, blocks, blockSelected, transformMode } = useEditor();

  interactivity();

  // Mesh refs keyed by point id, used by TransformControls.
  let meshRefs = {};
  let blockRefs = {};

  // Clear selection when the full set of IDs changes (e.g. random generation).
  let prevIds = $controlPoints.map((p) => p.id).join(",");
  $: {
    const currentIds = $controlPoints.map((p) => p.id).join(",");
    if (currentIds !== prevIds) {
      prevIds = currentIds;
      $pointSelected = null;
    }
  }

  // Drive {#each} using $controlPoints directly (we removed {#key} to prevent raycaster unmount crashes)

  function selectPoint(id) {
    $pointSelected = id;
    $blockSelected = null;
  }

  function selectBlock(id) {
    $blockSelected = id;
    $pointSelected = null;
  }

  function onBlockTransform(e, i) {
    const obj = e.target.object;
    $blocks[i].position = [obj.position.x, obj.position.y, obj.position.z];
    $blocks[i].rotation = [obj.rotation.x, obj.rotation.y, obj.rotation.z];
    $blocks[i].scale = [obj.scale.x, obj.scale.y, obj.scale.z];
    $blocks = [...$blocks];
  }

  function handleKeydown(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === 't') $transformMode = "translate";
    if (e.key === 'r') $transformMode = "rotate";
    if (e.key === 'e') $transformMode = "scale";
  }

  $: colors = $pointColors;
</script>

<svelte:window on:keydown={handleKeydown} />

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
    <!-- Sphere mesh for control points -->
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

<EditorFloor />

<SplineTrack controlPoints={$controlPoints} isEditor={true} />

{#if $blocks}
  <Suspense>
    {#each $blocks as block, i (block.id)}
      <T.Group
        position={block.position}
        rotation={block.rotation}
        scale={block.scale}
        bind:ref={blockRefs[block.id]}
        on:click={(e) => {
          e.stopPropagation();
          selectBlock(block.id);
        }}
      >
        {#if block.type === "bumper"}
          <Bumper restitution={block.restitution} />
        {:else if block.type === "boost"}
          <BoostPad boostForce={block.boostForce} />
        {:else if block.type === "ramp" || block.type === "slope"}
          <RampBlock type={block.type} variation={block.variation} />
        {:else if block.type === "loop"}
          <LoopBlock />
        {:else if block.type === "halfpipe"}
          <HalfPipeBlock />
        {:else if block.type === "ice"}
          <IcePatch />
        {:else if block.type === "sand"}
          <SandTrap />
        {:else if block.type === "water"}
          <WaterHazard />
        {:else if block.type === "plinko"}
          <PlinkoPegs />
        {/if}
      </T.Group>

      {#if block.id === $blockSelected && blockRefs[block.id]}
        <TransformControls
          object={blockRefs[block.id]}
          mode={$transformMode}
          on:objectChange={(e) => onBlockTransform(e, i)}
          on:mouseUp={() => blocks.commit()}
        />
      {/if}
    {/each}
  </Suspense>
{/if}
