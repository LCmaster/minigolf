<script>
  import { T } from "@threlte/core";
  import {
    interactivity,
    OrbitControls,
    TransformControls,
    Suspense
  } from "@threlte/extras";
  import SplineTrack from "./SplineTrack.svelte";
  import SplineVisualizer from "./SplineVisualizer.svelte";
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
  import Ground from "$lib/scene/Ground.svelte";
  import { evaluateHeightmapAt } from "$lib/heightmapGeometry";
  import { useEditor } from "../context";

  const {
    controlPoints,
    pointSelected,
    pointColors,
    blocks,
    blockSelected,
    transformMode,
    stage,
    placementBlock,
    previewPosition,
    previewRotation,
    extendTrack,
    insertPointAfterSelected,
    duplicateSelectedBlock,
    deleteSelected,
  } = useEditor();

  interactivity();

  // Mesh refs keyed by point/block id, used by TransformControls.
  let meshRefs = {};
  let blockRefs = {};
  let isDraggingGizmo = false;

  // Clear selection only when a brand-new set of control points is loaded (e.g. random generation)
  // while keeping selection intact when points are added/inserted/deleted interactively.
  let prevFirstId = $controlPoints[0]?.id;
  $: {
    const currentFirstId = $controlPoints[0]?.id;
    if (currentFirstId !== prevFirstId) {
      prevFirstId = currentFirstId;
      $pointSelected = null;
    }
  }

  function selectPoint(id) {
    $pointSelected = id;
    $blockSelected = null;
  }

  function selectBlock(id) {
    $blockSelected = id;
    $pointSelected = null;
  }

  // Segregate unselected basic blocks for instancing; selected blocks render individually so TransformControls works
  $: instancedTypes = ["ice", "sand", "water"];
  $: iceBlocks = $blocks ? $blocks.filter((b) => b.type === "ice" && b.id !== $blockSelected) : [];
  $: sandBlocks = $blocks ? $blocks.filter((b) => b.type === "sand" && b.id !== $blockSelected) : [];
  $: waterBlocks = $blocks ? $blocks.filter((b) => b.type === "water" && b.id !== $blockSelected) : [];
  $: complexBlocks = $blocks ? $blocks.filter((b) => !instancedTypes.includes(b.type) || b.id === $blockSelected) : [];

  function onPointTransform(e, id) {
    const obj = e.target.object;
    if (!obj) return;
    const index = $controlPoints.findIndex((p) => p.id === id);
    if (index !== -1) {
      const nextX = Math.round(obj.position.x * 10) / 10;
      const nextZ = Math.round(obj.position.z * 10) / 10;
      const activeAxis = e.target.axis || "";

      // When dragging horizontally (X, Z, XZ), automatically follow the terrain elevation
      let nextY;
      if (activeAxis === "X" || activeAxis === "Z" || activeAxis === "XZ") {
        nextY = Math.round((evaluateHeightmapAt(nextX, nextZ).height + 0.06) * 10) / 10;
      } else {
        nextY = Math.round(Math.max(-5, Math.min(12, obj.position.y - 1.5)) * 10) / 10;
      }

      obj.position.y = nextY + 1.5;
      $controlPoints[index].position = [nextX, nextY, nextZ];
      $controlPoints = [...$controlPoints];
    }
  }

  function onBlockTransform(e, id) {
    const obj = e.target.object;
    if (!obj) return;
    const index = $blocks.findIndex((b) => b.id === id);
    if (index !== -1) {
      $blocks[index].position = [
        Math.round(obj.position.x * 100) / 100,
        Math.round(obj.position.y * 100) / 100,
        Math.round(obj.position.z * 100) / 100,
      ];
      $blocks[index].rotation = [obj.rotation.x, obj.rotation.y, obj.rotation.z];
      $blocks[index].scale = [obj.scale.x, obj.scale.y, obj.scale.z];
      $blocks = [...$blocks];
    }
  }

  function handleKeydown(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

    // Ghost placement rotation shortcuts (Q / E)
    if ($placementBlock) {
      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        $previewRotation = [$previewRotation[0], $previewRotation[1] + Math.PI / 12, $previewRotation[2]];
        return;
      }
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        $previewRotation = [$previewRotation[0], $previewRotation[1] - Math.PI / 12, $previewRotation[2]];
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && (e.key === "d" || e.key === "D")) {
      e.preventDefault();
      duplicateSelectedBlock();
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteSelected();
      return;
    }

    if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      extendTrack();
      return;
    }

    if (e.key === "i" || e.key === "I") {
      e.preventDefault();
      insertPointAfterSelected();
      return;
    }

    if (e.key === "t" || e.key === "T") $transformMode = "translate";
    if (e.key === "r" || e.key === "R") $transformMode = "rotate";
    if (e.key === "e" || e.key === "E") $transformMode = "scale";
  }

  function makeGhost(node) {
    const applyGhost = (obj) => {
      obj.traverse((child) => {
        if (child.isMesh && child.material) {
          if (!child.userData.isGhosted) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 0.55;
            child.castShadow = false;
            child.receiveShadow = false;
            child.userData.isGhosted = true;
          }
        }
      });
    };

    applyGhost(node);

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

<EnvironmentSettings theme={$stage.theme || "clear"} />
<T.PerspectiveCamera
  makeDefault
  fov={65}
  on:create={({ ref }) => {
    ref.position.set(10, 16, 16);
    ref.lookAt(0, 0, -5);
  }}
>
  <OrbitControls enabled={!isDraggingGizmo} enableDamping dampingFactor={0.12} />
</T.PerspectiveCamera>

<!-- 3D Spline Centerline & Fairway Width / Bank Angle Cross-Ribs -->
<SplineVisualizer
  controlPoints={$controlPoints}
  selectedPointId={$pointSelected}
/>

{#each $controlPoints as point, i (point.id)}
  <!-- Draggable 3D Sphere Handle for Control Points -->
  <T.Mesh
    position={[point.position[0], point.position[1] + 1.5, point.position[2]]}
    bind:ref={meshRefs[point.id]}
    on:click={(e) => {
      e.stopPropagation();
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
    <T.SphereGeometry args={[0.55, 20, 20]} />
    <T.MeshBasicMaterial
      color={i === 0
        ? "#22c55e"
        : point.id === $pointSelected
          ? colors.selected
          : colors.normal}
      depthTest={false}
      transparent={true}
      opacity={0.9}
    />
  </T.Mesh>

  {#if point.id === $pointSelected && meshRefs[point.id]}
    <TransformControls
      object={meshRefs[point.id]}
      mode="translate"
      on:objectChange={(e) => onPointTransform(e, point.id)}
      on:dragging-changed={(e) => {
        isDraggingGizmo = e.detail.value;
        if (e.detail.value === true) controlPoints.commit();
      }}
    />
  {/if}
{/each}

<Ground />
{#if $stage.terrainMode === "classic"}
  <BackgroundHills controlPoints={$controlPoints} />
{/if}

<SplineTrack
  controlPoints={$controlPoints}
  isEditor={true}
  tileColor={$stage.tileColor || "#567D46"}
  terrainMode={$stage.terrainMode || "heightmap"}
/>

<!-- INSTANCED BLOCKS (Massive performance boost for unselected basic assets) -->
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

<!-- COMPLEX & SELECTED BLOCKS (Rendered Individually) -->
{#if complexBlocks.length > 0 || $placementBlock}
  <Suspense>
    <!-- GHOST BLOCK PREVIEW -->
    {#if $placementBlock}
      <T.Group
        position={$previewPosition}
        rotation={$previewRotation}
        on:create={({ ref }) => makeGhost(ref)}
      >
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

    {#each complexBlocks as block (block.id)}
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
      </T.Group>

      {#if block.id === $blockSelected && blockRefs[block.id]}
        <TransformControls
          object={blockRefs[block.id]}
          mode={$transformMode}
          on:objectChange={(e) => onBlockTransform(e, block.id)}
          on:dragging-changed={(e) => {
            isDraggingGizmo = e.detail.value;
            if (e.detail.value === true) blocks.commit();
          }}
        />
      {/if}
    {/each}
  </Suspense>
{/if}
