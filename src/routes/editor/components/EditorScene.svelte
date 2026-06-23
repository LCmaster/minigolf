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
  import EnvironmentSettings from "$lib/scene/EnvironmentSettings.svelte";
  import Bumper from "$lib/scene/obstacles/Bumper.svelte";
  import BoostPad from "$lib/scene/obstacles/BoostPad.svelte";
  import RampBlock from "$lib/scene/blocks/RampBlock.svelte";
  import LoopBlock from "$lib/scene/blocks/LoopBlock.svelte";
  import WindmillBlock from "$lib/scene/blocks/WindmillBlock.svelte";
  import TreeBlock from "$lib/scene/blocks/TreeBlock.svelte";
  import RockBlock from "$lib/scene/blocks/RockBlock.svelte";
  import GrassBlock from "$lib/scene/blocks/GrassBlock.svelte";
  import IcePatch from "$lib/scene/obstacles/IcePatch.svelte";
  import SandTrap from "$lib/scene/obstacles/SandTrap.svelte";
  import WaterHazard from "$lib/scene/obstacles/WaterHazard.svelte";
  import PlinkoPegs from "$lib/scene/obstacles/PlinkoPegs.svelte";
  import InstancedObstacles from "./InstancedObstacles.svelte";
  import BackgroundHills from "$lib/scene/BackgroundHills.svelte";
  import { useEditor } from "../context";

  const { controlPoints, pointSelected, pointColors, blocks, blockSelected, transformMode, stage, placementBlock, previewPosition } = useEditor();

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

  // Segregate basic blocks for instancing
  $: instancedTypes = ["ice", "sand", "water"];
  $: iceBlocks = $blocks ? $blocks.filter((b) => b.type === "ice") : [];
  $: sandBlocks = $blocks ? $blocks.filter((b) => b.type === "sand") : [];
  $: waterBlocks = $blocks ? $blocks.filter((b) => b.type === "water") : [];
  $: complexBlocks = $blocks ? $blocks.filter((b) => !instancedTypes.includes(b.type)) : [];

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

  function makeGhost(node) {
    const applyGhost = (obj) => {
      obj.traverse((child) => {
        if (child.isMesh && child.material) {
          if (!child.userData.isGhosted) {
            // Some meshes share materials, clone it so we don't turn the whole world transparent
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 0.5;
            // Disable shadows for the ghost
            child.castShadow = false;
            child.receiveShadow = false;
            child.userData.isGhosted = true;
          }
        }
      });
    };

    applyGhost(node);

    // Intercept future child additions (since Svelte mounts children after parents)
    const originalAdd = node.add.bind(node);
    node.add = (...object) => {
      originalAdd(...object);
      object.forEach(applyGhost);
      return node;
    };
  }

  $: colors = $pointColors;
</script>

<svelte:window on:keydown={handleKeydown} />

<EnvironmentSettings theme={$stage.theme || 'clear'} />
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

<BackgroundHills controlPoints={$controlPoints} />
<EditorFloor />

<SplineTrack controlPoints={$controlPoints} isEditor={true} />

<!-- INSTANCED BLOCKS (Massive performance boost for basic assets) -->
<InstancedObstacles blocks={iceBlocks} positionOffset={[0, 0.005, 0]}>
  <T.BoxGeometry args={[2, 0.01, 2]} />
  <T.MeshStandardMaterial color="#a5f3fc" roughness={0.0} metalness={0.2} transparent={true} opacity={0.8} />
</InstancedObstacles>

<InstancedObstacles blocks={sandBlocks} positionOffset={[0, 0.005, 0]}>
  <T.BoxGeometry args={[2, 0.01, 2]} />
  <T.MeshStandardMaterial color="#eab308" roughness={1.0} metalness={0.0} />
</InstancedObstacles>

<InstancedObstacles blocks={waterBlocks} positionOffset={[0, -0.25, 0]}>
  <T.BoxGeometry args={[2, 0.5, 2]} />
  <T.MeshStandardMaterial color="#3b82f6" transparent={true} opacity={0.6} roughness={0.1} metalness={0.8} />
</InstancedObstacles>

<!-- COMPLEX BLOCKS (Rendered Individually) -->
{#if complexBlocks.length > 0 || $placementBlock}
  <Suspense>
    <!-- GHOST BLOCK PREVIEW -->
    {#if $placementBlock}
      <T.Group position={$previewPosition} on:create={({ ref }) => makeGhost(ref)}>
        {#if $placementBlock.type === "bumper"}
          <Bumper restitution={2.0} isEditor={true} />
        {:else if $placementBlock.type === "boost"}
          <BoostPad boostForce={15} isEditor={true} />
        {:else if $placementBlock.type === "ramp" || $placementBlock.type === "slope"}
          <RampBlock type={$placementBlock.type} variation={$placementBlock.variation} isEditor={true} />
        {:else if $placementBlock.type === "loop"}
          <LoopBlock isEditor={true} />
        {:else if $placementBlock.type === "windmill"}
          <WindmillBlock isEditor={true} />
        {:else if $placementBlock.type === "ice"}
          <IcePatch isEditor={true} />
        {:else if $placementBlock.type === "sand"}
          <SandTrap isEditor={true} />
        {:else if $placementBlock.type === "water"}
          <WaterHazard isEditor={true} />
        {:else if $placementBlock.type === "plinko"}
          <PlinkoPegs isEditor={true} />
        {:else if $placementBlock.type === "tree"}
          <TreeBlock isEditor={true} variation={$placementBlock.variation} />
        {:else if $placementBlock.type === "rock"}
          <RockBlock isEditor={true} variation={$placementBlock.variation} />
        {:else if $placementBlock.type === "grass"}
          <GrassBlock isEditor={true} variation={$placementBlock.variation} />
        {/if}
      </T.Group>
    {/if}

    {#each complexBlocks as block, i (block.id)}
      <T.Group
        position={block.position}
        rotation={block.rotation}
        scale={block.scale || [1, 1, 1]}
        bind:ref={blockRefs[block.id]}
        on:click={(e) => {
          e.stopPropagation();
          selectBlock(block.id);
        }}
      >
        {#key block.rotation.join(',') + block.position.join(',')}
          {#if block.type === "bumper"}
            <Bumper restitution={block.restitution} isEditor={true} />
          {:else if block.type === "boost"}
            <BoostPad boostForce={block.boostForce} isEditor={true} />
          {:else if block.type === "ramp" || block.type === "slope"}
            <RampBlock type={block.type} variation={block.variation} isEditor={true} />
          {:else if block.type === "loop"}
            <LoopBlock isEditor={true} />
          {:else if block.type === "windmill"}
            <WindmillBlock isEditor={true} />
          {:else if block.type === "ice"}
            <IcePatch isEditor={true} />
          {:else if block.type === "sand"}
            <SandTrap isEditor={true} />
          {:else if block.type === "water"}
            <WaterHazard isEditor={true} />
          {:else if block.type === "plinko"}
            <PlinkoPegs isEditor={true} />
          {:else if block.type === "tree"}
            <TreeBlock isEditor={true} variation={block.variation} />
          {:else if block.type === "rock"}
            <RockBlock isEditor={true} variation={block.variation} />
          {:else if block.type === "grass"}
            <GrassBlock isEditor={true} variation={block.variation} />
          {/if}
        {/key}
      </T.Group>

      {#if block.id === $blockSelected && blockRefs[block.id]}
        <TransformControls
          object={blockRefs[block.id]}
          mode={$transformMode}
          on:objectChange={(e) => onBlockTransform(e, i)}
          on:dragging-changed={(e) => {
            if (e.detail.value === true) blocks.commit();
          }}
        />
      {/if}
    {/each}
  </Suspense>
{/if}
