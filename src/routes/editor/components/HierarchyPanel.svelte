<script>
  import { getModalStore } from "@skeletonlabs/skeleton";
  import { useEditor } from "../context";
  import { ProceduralGenerator } from "$lib/ProceduralGenerator";

  const { controlPoints, pointSelected, blocks, blockSelected, stage } = useEditor();
  const modalStore = getModalStore();

  $: selectedIndex = $controlPoints.findIndex((p) => p.id === $pointSelected);
  $: selectedPoint =
    selectedIndex !== -1 ? $controlPoints[selectedIndex] : null;

  $: selectedBlockIndex = $blocks ? $blocks.findIndex((b) => b.id === $blockSelected) : -1;
  $: selectedBlock = selectedBlockIndex !== -1 ? $blocks[selectedBlockIndex] : null;

  const deletePointModal = {
    type: "confirm",
    title: "Delete Point",
    body: "Are you sure you wish to delete this control point?",
    response: (r) => {
      if (r && selectedIndex !== -1) {
        controlPoints.commit();
        $controlPoints.splice(selectedIndex, 1);
        $controlPoints = [...$controlPoints];
        $pointSelected = null;
      }
    },
  };

  const deleteBlockModal = {
    type: "confirm",
    title: "Delete Block",
    body: "Are you sure you wish to delete this block?",
    response: (r) => {
      if (r && selectedBlockIndex !== -1) {
        blocks.commit();
        $blocks.splice(selectedBlockIndex, 1);
        $blocks = [...$blocks];
        $blockSelected = null;
      }
    },
  };
</script>

<div
  id="sidebar-left"
  class="w-64 h-full flex flex-col bg-surface-100-800-token border-r border-surface-500/30"
>
  <div class="flex-grow flex flex-col overflow-hidden">
    <!-- <div class="p-4 flex flex-col gap-4 flex-shrink-0">
      {#if selectedPoint}
        <h3 class="h3">Point Selected</h3>
        <p>X: {selectedPoint.position[0].toFixed(2)}</p>
        <p>Z: {selectedPoint.position[2].toFixed(2)}</p>
      {:else}
        <p class="text-surface-400">Select a point to edit properties</p>
      {/if}
    </div> -->

    <!-- Point Color Settings -->
    <!-- <div class="p-4 flex-shrink-0 border-t border-surface-500/30">
      <h4 class="h4 mb-3">Point Colors</h4>
      <div class="grid grid-cols-2 gap-3">
        <label class="flex flex-col gap-1 text-xs">
          <span class="text-surface-400">Default</span>
          <input
            type="color"
            class="w-full h-8 rounded cursor-pointer"
            value={$pointColors.normal}
            on:input={(e) => ($pointColors = { ...$pointColors, normal: e.target.value })}
          />
        </label>
        <label class="flex flex-col gap-1 text-xs">
          <span class="text-surface-400">Hover</span>
          <input
            type="color"
            class="w-full h-8 rounded cursor-pointer"
            value={$pointColors.hover}
            on:input={(e) => ($pointColors = { ...$pointColors, hover: e.target.value })}
          />
        </label>
        <label class="flex flex-col gap-1 text-xs">
          <span class="text-surface-400">Selected</span>
          <input
            type="color"
            class="w-full h-8 rounded cursor-pointer"
            value={$pointColors.selected}
            on:input={(e) => ($pointColors = { ...$pointColors, selected: e.target.value })}
          />
        </label>
        <label class="flex flex-col gap-1 text-xs">
          <span class="text-surface-400">Selected Hover</span>
          <input
            type="color"
            class="w-full h-8 rounded cursor-pointer"
            value={$pointColors.selectedHover}
            on:input={(e) => ($pointColors = { ...$pointColors, selectedHover: e.target.value })}
          />
        </label>
      </div>
    </div> -->

    <div class="p-4 flex-grow overflow-y-auto border-t border-surface-500/30">
      <h4 class="h4 mb-4">All Points</h4>
      <div class="flex flex-col gap-2">
        {#each $controlPoints as point, index (point.id)}
          <button
            class="btn w-full text-left justify-start {point.id === $pointSelected
              ? 'variant-filled-primary'
              : 'variant-soft'} {(index === 0 || index === $controlPoints.length - 1) ? 'flex items-center gap-2' : ''}"
            on:click={() => {
              $pointSelected = point.id;
              $blockSelected = null;
            }}
          >
            {#if index === 0}
              <img src="/editor-icons/map-pin.svg" alt="Start" class="w-4 h-4" />
              <span class="text-success-400">Start (locked pos)</span>
            {:else if index === $controlPoints.length - 1}
              <img src="/editor-icons/flag.svg" alt="End" class="w-4 h-4" />
              <span class="text-error-400">End Point</span>
            {:else}
              Point {index + 1}
            {/if}
          </button>
        {/each}
      </div>

      {#if $blocks && $blocks.length > 0}
        <h4 class="h4 mb-4 mt-6">All Blocks</h4>
        <div class="flex flex-col gap-2">
          {#each $blocks as block, index (block.id)}
            <button
              class="btn w-full text-left justify-start {block.id === $blockSelected
                ? 'variant-filled-primary'
                : 'variant-soft'}"
              on:click={() => {
                $blockSelected = block.id;
                $pointSelected = null;
              }}
            >
              Block {index + 1} ({block.type || 'Custom'})
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
  <div
    class="p-4 flex-shrink-0 border-t border-surface-500/30 flex flex-col gap-2"
  >
    <button
      class="w-full btn variant-filled-primary"
      on:click={() => {
        controlPoints.commit();
        const gen = ProceduralGenerator.generateRandomCourse();
        $controlPoints = gen.controlPoints;
        $blocks = gen.blocks;
        $stage.par = gen.par;
        $pointSelected = null;
        $blockSelected = null;
      }}
    >
      Generate Random Course
    </button>
    <button
      class="w-full btn variant-filled-error"
      on:click={() => {
        if ($pointSelected) modalStore.trigger(deletePointModal);
        else if ($blockSelected) modalStore.trigger(deleteBlockModal);
      }}
      disabled={(!selectedPoint || selectedIndex === 0) && !selectedBlock}
    >
      Delete Selected
    </button>
  </div>
</div>
