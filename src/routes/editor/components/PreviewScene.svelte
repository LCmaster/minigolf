<script>
  import { T } from "@threlte/core";
  import { OrbitControls, Suspense } from "@threlte/extras";
  import { useEditor } from "../context";
  import EnvironmentSettings from "$lib/scene/EnvironmentSettings.svelte";
  import SplineTrack from "./SplineTrack.svelte";
  import CourseRenderer from "$lib/scene/course/CourseRenderer.svelte";
  import Ground from "$lib/scene/Ground.svelte";
  import BackgroundHills from "$lib/scene/BackgroundHills.svelte";

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

<EnvironmentSettings theme={$stage.theme || 'clear'} />

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

<Ground />
{#if $stage.terrainMode === "classic"}
  <BackgroundHills controlPoints={$controlPoints} />
{/if}

<!-- Full track rendered without editor overlays, no physics -->
<SplineTrack
  controlPoints={$controlPoints}
  isEditor={false}
  isPreview={true}
  tileColor={$stage.tileColor || "#567D46"}
  terrainMode={$stage.terrainMode || "heightmap"}
/>

{#if $blocks && $blocks.length > 0}
  <Suspense>
    <CourseRenderer blocks={$blocks} />
  </Suspense>
{/if}
