<script>
  import { Canvas } from "@threlte/core";
  import { World, Debug } from "@threlte/rapier";
  import { AppShell } from "@skeletonlabs/skeleton";
  import EditorScene from "./components/EditorScene.svelte";
  import TestScene from "./components/TestScene.svelte";
  import PreviewScene from "./components/PreviewScene.svelte";
  import Header from "./components/Header.svelte";
  import HierarchyPanel from "./components/HierarchyPanel.svelte";
  import InspectorPanel from "./components/InspectorPanel.svelte";

  import { setEditor } from "./context";
  import { page } from "$app/stores";
  import { getLevel } from "$lib/level";
  import { user } from "$lib/user";
  import { userProfile, canEditLevels } from "$lib/stores/profile";
  import { goto } from "$app/navigation";

  $: if ($userProfile && !$canEditLevels) goto("/");

  const {
    testing,
    previewing,
    debugPhysics,
    controlPoints,
    pointSelected,
    blocks,
    blockSelected,
    stage,
    history,
    placementBlock,
    previewRotation,
  } = setEditor();

  let showingAssets = true;
  let showLeftPanel = true;
  let showRightPanel = true;
  let activeCategory = "all";

  const categories = [
    { id: "all", label: "All" },
    { id: "hazards", label: "Hazards" },
    { id: "contraptions", label: "Contraptions" },
    { id: "scenery", label: "Scenery" },
  ];

  const availableBlocks = [
    { type: "sand", variation: 1, label: "Sand Trap", category: "hazards", badge: "Slow" },
    { type: "water", variation: 1, label: "Water Hazard", category: "hazards", badge: "Penalty" },
    { type: "ice", variation: 1, label: "Ice Patch", category: "hazards", badge: "Slip" },
    { type: "boost", variation: 1, label: "Boost Pad", category: "contraptions", badge: "Speed" },
    { type: "bumper", variation: 1, label: "Pinball Bumper", category: "contraptions", badge: "Bounce" },
    { type: "ramp", variation: 1, label: "Jump Ramp", category: "contraptions", badge: "Air" },
    { type: "windmill", variation: 1, label: "Windmill", category: "contraptions", badge: "Spin" },
    { type: "loop", variation: 1, label: "Loop-de-Loop", category: "contraptions", badge: "Stunt" },
    { type: "plinko", variation: 1, label: "Plinko Pegs", category: "contraptions", badge: "Chaos" },
    { type: "tree", variation: 1, label: "Pine Tree", category: "scenery", badge: "Decor" },
    { type: "tree", variation: 2, label: "Oak Tree", category: "scenery", badge: "Decor" },
    { type: "rock", variation: 1, label: "Boulder A", category: "scenery", badge: "Decor" },
    { type: "rock", variation: 2, label: "Boulder B", category: "scenery", badge: "Decor" },
    { type: "grass", variation: 1, label: "Tuft A", category: "scenery", badge: "Decor" },
    { type: "grass", variation: 2, label: "Tuft B", category: "scenery", badge: "Decor" },
  ];

  $: filteredBlocks =
    activeCategory === "all"
      ? availableBlocks
      : availableBlocks.filter((b) => b.category === activeCategory);

  function startPlacement(item) {
    if (
      $placementBlock &&
      $placementBlock.type === item.type &&
      $placementBlock.variation === item.variation
    ) {
      $placementBlock = null;
      return;
    }
    $placementBlock = {
      type: item.type,
      variation: item.variation,
      label: item.label,
    };
  }

  $: previewYawDeg = Math.round((($previewRotation?.[1] || 0) * 180) / Math.PI);

  let loadedCourseId = null;

  $: if ($user !== undefined && $page.url.searchParams.get("courseId") && loadedCourseId !== $page.url.searchParams.get("courseId")) {
    const courseId = $page.url.searchParams.get("courseId");
    loadedCourseId = courseId;
    getLevel(courseId).then((loadedCourse) => {
      if (loadedCourse.isCampaign) {
        alert("Campaigns cannot be edited directly. Please edit the individual base levels and rebuild the campaign in the Campaign Builder.");
        goto("/mylevels");
        return;
      }
      if (loadedCourse.holes && loadedCourse.holes.length > 0) {
        const hole = loadedCourse.holes[0];
        history.commit();
        history.update((h) => ({
          ...h,
          controlPoints: hole.controlPoints,
          blocks: hole.blocks || [],
        }));
        $stage = {
          id: loadedCourse.id || courseId,
          name: loadedCourse.name,
          theme: loadedCourse.theme || "clear",
          par: hole.par || 2,
          strokeLimit: 8,
          groundFriction: hole.groundFriction ?? 0.75,
          groundRestitution: hole.groundRestitution ?? 0.05,
          wallFriction: hole.wallFriction ?? 0.75,
          wallRestitution: hole.wallRestitution ?? 0.95,
          tileColor: hole.tileColor || "#567D46",
          terrainMode: hole.terrainMode || "heightmap",
        };
      }
    }).catch(e => {
      console.error("Failed to load custom level for editing", e);
      alert(e.message || "Failed to load level.");
      goto("/mylevels");
    });
  }

  function handleKeydown(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
      e.preventDefault();
      history.undo();
    } else if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "y" || (e.shiftKey && e.key === "z"))
    ) {
      e.preventDefault();
      history.redo();
    } else if (e.key === "`" || e.key === "F3") {
      e.preventDefault();
      $debugPhysics = !$debugPhysics;
    } else if (e.key === "p" || e.key === "P") {
      if ($controlPoints && $controlPoints.length >= 2) {
        $previewing = false;
        $testing = !$testing;
      }
    } else if (e.key === "Escape") {
      if ($placementBlock) {
        $placementBlock = null;
      } else {
        if ($previewing) previewing.set(false);
        if ($testing) testing.set(false);
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<AppShell regionPage="relative overflow-hidden" slotPageHeader="sticky top-0 z-20">
  <svelte:fragment slot="header">
    <Header
      bind:showingAssets
      bind:showLeftPanel
      bind:showRightPanel
    />
  </svelte:fragment>
  <svelte:fragment slot="sidebarLeft">
    {#if !$testing && !$previewing && showLeftPanel}
      <HierarchyPanel />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="sidebarRight">
    {#if !$testing && !$previewing && showRightPanel}
      <InspectorPanel />
    {/if}
  </svelte:fragment>

  <!-- Main 3D Viewport -->
  <div class="relative w-full h-full">
    <Canvas rendererParameters={{ preserveDrawingBuffer: true }}>
      <World gravity={[0, -15, 0]}>
        {#if $debugPhysics}
          <Debug />
        {/if}

        {#if $testing}
          <TestScene on:completed={() => ($testing = false)} />
        {:else if $previewing}
          <PreviewScene />
        {:else}
          <EditorScene />
        {/if}
      </World>
    </Canvas>

    <!-- Active Ghost Placement Floating Banner -->
    {#if $placementBlock && !$testing && !$previewing}
      <div
        class="pointer-events-auto absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-full bg-surface-900/95 border border-primary-500/60 shadow-xl text-white text-xs"
      >
        <span class="font-bold text-primary-400">
          Placing: {$placementBlock.label || $placementBlock.type}
        </span>
        <span class="text-surface-300">|</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="px-1.5 py-0.5 rounded bg-surface-700 hover:bg-surface-600 font-mono"
            on:click={() =>
              ($previewRotation = [
                $previewRotation[0],
                $previewRotation[1] + Math.PI / 12,
                $previewRotation[2],
              ])}
          >
            ↺ Q
          </button>
          <span class="font-mono w-10 text-center text-sky-300">{previewYawDeg}°</span>
          <button
            type="button"
            class="px-1.5 py-0.5 rounded bg-surface-700 hover:bg-surface-600 font-mono"
            on:click={() =>
              ($previewRotation = [
                $previewRotation[0],
                $previewRotation[1] - Math.PI / 12,
                $previewRotation[2],
              ])}
          >
            E ↻
          </button>
        </div>
        <span class="text-surface-300 hidden sm:inline">
          • Click terrain to place • Hold <strong>Shift</strong> for multi-place
        </span>
        <button
          type="button"
          class="ml-1 px-2 py-0.5 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 font-semibold"
          on:click={() => ($placementBlock = null)}
        >
          Cancel (Esc)
        </button>
      </div>
    {/if}

    <!-- Bottom Categorized Obstacle & Scenery Dock -->
    {#if showingAssets && !$testing && !$previewing}
      <div
        class="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-4xl rounded-xl bg-surface-900/90 backdrop-blur-md border border-surface-500/40 shadow-2xl p-2.5 text-white select-none"
      >
        <!-- Dock Header & Category Tabs -->
        <div class="flex items-center justify-between gap-2 mb-2 px-1">
          <div class="flex items-center gap-1.5 overflow-x-auto">
            {#each categories as cat}
              <button
                type="button"
                class="px-2.5 py-1 rounded-lg text-xs font-semibold transition {activeCategory ===
                cat.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-800 hover:bg-surface-700 text-surface-300'}"
                on:click={() => (activeCategory = cat.id)}
              >
                {cat.label}
              </button>
            {/each}
          </div>

          <button
            type="button"
            class="text-xs px-2 py-0.5 rounded bg-surface-800 hover:bg-surface-700 text-surface-300"
            title="Minimize Dock"
            on:click={() => (showingAssets = false)}
          >
            ▾ Hide Dock
          </button>
        </div>

        <!-- Horizontal Scrollable Obstacle Cards -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          {#each filteredBlocks as item (`${item.type}-${item.variation}`)}
            {@const isActive =
              $placementBlock?.type === item.type &&
              $placementBlock?.variation === item.variation}
            <button
              type="button"
              class="flex-shrink-0 w-24 p-2 rounded-lg border transition flex flex-col items-center gap-1 {isActive
                ? 'bg-primary-500/30 border-primary-400 ring-2 ring-primary-400/50'
                : 'bg-surface-800/80 hover:bg-surface-700/80 border-surface-500/20'}"
              on:click={() => startPlacement(item)}
            >
              <img
                src={`/block/${item.type}/${item.variation}.png`}
                alt={item.label}
                class="w-10 h-10 object-contain"
                on:error={(e) => (e.currentTarget.src = "/editor-icons/bricks.svg")}
              />
              <span class="text-[11px] font-medium truncate w-full text-center">
                {item.label}
              </span>
              <span class="text-[9px] px-1.5 py-0.2 rounded bg-surface-700 text-surface-300">
                {item.badge}
              </span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</AppShell>
