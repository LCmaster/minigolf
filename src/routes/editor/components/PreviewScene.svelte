<script>
  import { T } from "@threlte/core";
  import { OrbitControls, Environment, Suspense } from "@threlte/extras";
  import { useEditor } from "../context";
  import { Vector3 } from "three";
  import SplineTrack from "./SplineTrack.svelte";
  import Bumper from "$lib/scene/obstacles/Bumper.svelte";
  import BoostPad from "$lib/scene/obstacles/BoostPad.svelte";
  import RampBlock from "$lib/scene/blocks/RampBlock.svelte";
  import LoopBlock from "$lib/scene/blocks/LoopBlock.svelte";
  import HalfPipeBlock from "$lib/scene/blocks/HalfPipeBlock.svelte";
  import IcePatch from "$lib/scene/obstacles/IcePatch.svelte";
  import SandTrap from "$lib/scene/obstacles/SandTrap.svelte";
  import WaterHazard from "$lib/scene/obstacles/WaterHazard.svelte";
  import PlinkoPegs from "$lib/scene/obstacles/PlinkoPegs.svelte";

  const { controlPoints, stage, blocks } = useEditor();

  // Auto-frame the camera on the track centroid
  $: centroid = (() => {
    if (!$controlPoints || $controlPoints.length === 0) return [0, 5, 0];
    const xs = $controlPoints.map((p) => p.position[0]);
    const zs = $controlPoints.map((p) => p.position[2]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    return [cx, 0, cz];
  })();

  $: spread = (() => {
    if (!$controlPoints || $controlPoints.length < 2) return 20;
    const xs = $controlPoints.map((p) => p.position[0]);
    const zs = $controlPoints.map((p) => p.position[2]);
    const w = Math.max(...xs) - Math.min(...xs);
    const d = Math.max(...zs) - Math.min(...zs);
    return Math.max(w, d, 20);
  })();

  // Camera sits above+behind the centroid, scaled by how spread out the course is
  $: camStart = [centroid[0], spread * 0.7, centroid[2] + spread * 0.8];
</script>

<T.AmbientLight intensity={0.6} />
<T.DirectionalLight
  position={[20, 30, 20]}
  intensity={2.5}
  castShadow
  shadow.mapSize.width={2048}
  shadow.mapSize.height={2048}
/>

<T.PerspectiveCamera
  makeDefault
  fov={55}
  on:create={({ ref }) => {
    ref.position.set(...camStart);
    ref.lookAt(...centroid);
  }}
>
  <OrbitControls
    target={centroid}
    enableDamping
    dampingFactor={0.08}
    minDistance={5}
    maxDistance={300}
  />
</T.PerspectiveCamera>

<!-- Full track rendered without editor overlays, no physics -->
<SplineTrack controlPoints={$controlPoints} isEditor={false} isPreview={true} />

{#if $blocks && $blocks.length > 0}
  <Suspense>
    {#each $blocks as block (block.id)}
      {#if block.type === "bumper"}
        <Bumper 
          position={block.position}
          rotation={block.rotation}
          scale={block.scale}
          restitution={block.restitution}
        />
      {:else if block.type === "boost"}
        <BoostPad 
          position={block.position}
          rotation={block.rotation}
          scale={block.scale}
          boostForce={block.boostForce}
        />
      {:else if block.type === "ramp" || block.type === "slope"}
        <RampBlock type={block.type} variation={block.variation} 
          position={block.position} rotation={block.rotation} scale={block.scale} />
      {:else if block.type === "loop"}
        <LoopBlock position={block.position} rotation={block.rotation} scale={block.scale} />
      {:else if block.type === "halfpipe"}
        <HalfPipeBlock position={block.position} rotation={block.rotation} scale={block.scale} />
      {:else if block.type === "ice"}
        <IcePatch position={block.position} rotation={block.rotation} scale={block.scale} />
      {:else if block.type === "sand"}
        <SandTrap position={block.position} rotation={block.rotation} scale={block.scale} />
      {:else if block.type === "water"}
        <WaterHazard position={block.position} rotation={block.rotation} scale={block.scale} />
      {:else if block.type === "plinko"}
        <PlinkoPegs position={block.position} rotation={block.rotation} scale={block.scale} />
      {/if}
    {/each}
  </Suspense>
{/if}
