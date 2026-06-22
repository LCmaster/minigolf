<script>
  import { Canvas } from "@threlte/core";
  import { Environment } from "@threlte/extras";
  import { World, Debug } from "@threlte/rapier";
  import { AppShell } from "@skeletonlabs/skeleton";
  import EditorScene from "./components/EditorScene.svelte";
  import TestScene from "./components/TestScene.svelte";
  import PreviewScene from "./components/PreviewScene.svelte";
  import Header from "./components/Header.svelte";
  import HierarchyPanel from "./components/HierarchyPanel.svelte";
  import InspectorPanel from "./components/InspectorPanel.svelte";
  import AssetsList from "./components/AssetsList.svelte";

  import { setEditor } from "./context";
  import { onMount } from "svelte";
  import { fly, fade } from "svelte/transition";
  import { page } from "$app/stores";
  import { getLevel } from "$lib/firebase";

  let { testing, previewing, controlPoints, stage, blocks, blockSelected } = setEditor();

  let showingAssets = false;

  const availableTypes = ["ramp", "bumper", "boost", "ice", "sand", "water", "plinko"];
  const availableBlocks = [
    { type: "ramp", variation: 1 },
    { type: "bumper", variation: 1 },
    { type: "boost", variation: 1 },
    { type: "ice", variation: 1 },
    { type: "sand", variation: 1 },
    { type: "water", variation: 1 },
    { type: "plinko", variation: 1 },
  ];

  function addBlock(detail) {
    const newBlock = {
      id: crypto.randomUUID(),
      type: detail.type,
      variation: detail.variation,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
    if (detail.type === "bumper") newBlock.restitution = 2.0;
    if (detail.type === "boost") newBlock.boostForce = 15;
    
    blocks.commit();
    $blocks = [...$blocks, newBlock];
    $blockSelected = newBlock.id;
  }

  onMount(async () => {
    const courseId = $page.url.searchParams.get("courseId");
    if (courseId) {
      try {
        const loadedCourse = await getLevel(courseId);
        // The loadedCourse has `{ name, skybox, holes: [{ par, controlPoints }] }`
        if (loadedCourse.holes && loadedCourse.holes.length > 0) {
          controlPoints.commit(); // Push current state to history before overwriting
          $controlPoints = loadedCourse.holes[0].controlPoints;
          if (loadedCourse.holes[0].blocks) {
            blocks.commit();
            $blocks = loadedCourse.holes[0].blocks;
          }
          $stage = {
            name: loadedCourse.name,
            skybox: loadedCourse.skybox,
            par: loadedCourse.holes[0].par
          };
        }
      } catch (e) {
        console.error("Failed to load custom level for editing", e);
      }
    }
  });

  function handleKeydown(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
      e.preventDefault();
      if ($blockSelected) {
        blocks.undo();
      } else {
        controlPoints.undo();
      }
    } else if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "y" || (e.shiftKey && e.key === "z"))
    ) {
      e.preventDefault();
      if ($blockSelected) {
        blocks.redo();
      } else {
        controlPoints.redo();
      }
    } else if (e.key === "Escape") {
      // Escape exits preview or test mode
      if ($previewing) previewing.set(false);
      if ($testing) testing.set(false);
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<AppShell regionPage="relative" slotPageHeader="sticky top-0 z-10">
  <svelte:fragment slot="header">
    <Header bind:showingAssets />
  </svelte:fragment>
  <svelte:fragment slot="sidebarLeft">
    {#if !$testing && !$previewing}
      <HierarchyPanel />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="sidebarRight">
    {#if !$testing && !$previewing}
      <InspectorPanel />
    {/if}
  </svelte:fragment>
  <Canvas rendererParameters={{ preserveDrawingBuffer: true }}>
    <World gravity={[0, -15, 0]}>
      {#if $testing}
        <TestScene on:completed={() => ($testing = false)} />
      {:else if $previewing}
        <Environment
          path={`/skybox/${$stage.skybox}/`}
          files={["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]}
          isBackground={true}
        />
        <PreviewScene />
      {:else}
        <Environment
          path={`/skybox/${$stage.skybox}/`}
          files={["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]}
          isBackground={true}
        />
        <EditorScene />
      {/if}
    </World>
  </Canvas>
</AppShell>

{#if showingAssets && !$testing && !$previewing}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="fixed inset-0 bg-surface-backdrop-token z-[9998]" 
    on:click={() => showingAssets = false}
    transition:fade={{ duration: 200 }}
  ></div>

  <!-- Drawer -->
  <div 
    class="fixed top-0 left-0 h-full w-80 sm:w-96 bg-surface-100-800-token z-[9999] shadow-2xl border-r border-surface-500/30 flex flex-col"
    transition:fly={{ x: -384, duration: 300 }}
  >
    <div class="p-4 flex justify-between items-center border-b border-surface-500/30">
      <h3 class="h3 font-bold flex items-center gap-2">
        <img src="/editor/bricks.svg" alt="Blocks" class="w-6 h-6" />
        Asset Catalog
      </h3>
      <button class="btn-icon btn-icon-sm variant-soft" on:click={() => showingAssets = false}>✕</button>
    </div>
    <div class="p-4 overflow-y-auto flex-1">
      <AssetsList 
        types={availableTypes} 
        blocks={availableBlocks} 
        on:assetSelected={(e) => {
          addBlock(e.detail);
          showingAssets = false;
        }} 
      />
    </div>
  </div>
{/if}
