<script>
  import { getModalStore } from "@skeletonlabs/skeleton";
  import { useEditor } from "../context";
  import { CourseBuilder } from "$lib/CourseBuilder";

  const { controlPoints, pointSelected } = useEditor();
  const modalStore = getModalStore();

  $: selectedIndex = $controlPoints.findIndex((p) => p.id === $pointSelected);
  $: selectedPoint =
    selectedIndex !== -1 ? $controlPoints[selectedIndex] : null;

  const deleteModal = {
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
              : 'variant-soft'} {index === 0 ? 'flex items-center gap-2' : ''}"
            on:click={() => ($pointSelected = point.id)}
          >
            {#if index === 0}
              <span class="text-success-400">⚑</span>
              <span>Start (locked pos)</span>
            {:else}
              Point {index + 1}
            {/if}
          </button>
        {/each}
      </div>
    </div>
  </div>
  <div
    class="p-4 flex-shrink-0 border-t border-surface-500/30 flex flex-col gap-2"
  >
    <button
      class="w-full btn variant-filled-primary"
      on:click={() => {
        console.log("generate random clicked");
        controlPoints.commit();
        const builder = new CourseBuilder();
        const numPoints = 5;
        console.log("generating " + numPoints + " random points");
        $controlPoints = builder.generateRandomSpline(numPoints);
        console.log($controlPoints);
      }}
    >
      Generate Random Course
    </button>
    <button
      class="w-full btn variant-filled-error"
      on:click={() => {
        modalStore.trigger(deleteModal);
      }}
      disabled={!selectedPoint || selectedIndex === 0}
    >
      Delete Point
    </button>
  </div>
</div>
