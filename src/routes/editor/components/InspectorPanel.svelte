<script>
  import { useEditor } from "../context";
  import { snapToGrid, TILE_SIZE } from "$lib/gridUtils";

  const { controlPoints, pointSelected, stage } = useEditor();

  $: selectedIndex = $controlPoints.findIndex((p) => p.id === $pointSelected);
  $: selectedPoint = selectedIndex !== -1 ? $controlPoints[selectedIndex] : null;

  /**
   * Move the selected point by `steps` tiles along the given axis.
   * The value is always snapped so it lands exactly on a tile centre.
   */
  function movePoint(axis, steps) {
    if (!selectedPoint) return;
    controlPoints.commit();
    const idx = selectedIndex;
    const pos = [...$controlPoints[idx].position];

    if (axis === "x") {
      pos[0] = snapToGrid(pos[0] + steps * TILE_SIZE);
    } else if (axis === "z") {
      pos[2] = snapToGrid(pos[2] + steps * TILE_SIZE);
    } else if (axis === "y") {
      let newY = pos[1] + steps * 1;
      if (newY < 0) newY = 0;
      if (newY > 10) newY = 10;
      pos[1] = newY;
    }

    $controlPoints[idx].position = pos;
    $controlPoints = [...$controlPoints];
  }

  // Tile-coordinate display  (1-based grid index)
  $: tileX = selectedPoint
    ? Math.round((selectedPoint.position[0] - TILE_SIZE / 2) / TILE_SIZE)
    : 0;
  $: tileZ = selectedPoint
    ? Math.round((selectedPoint.position[2] - TILE_SIZE / 2) / TILE_SIZE)
    : 0;
</script>

<div class="w-72 h-full flex flex-col bg-surface-100-800-token border-l border-surface-500/30 p-4 overflow-y-auto">
  {#if selectedPoint}
    <!-- Point Inspector -->
    <h3 class="h3 mb-4">Point Inspector</h3>
    <div class="flex flex-col gap-4">
      {#if selectedIndex !== 0}
        <div class="card p-4 variant-soft flex flex-col gap-3">
          <h4 class="h4 text-sm uppercase tracking-wider opacity-70">Position</h4>

          <!-- X axis stepper -->
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">X Axis</span>
            <div class="flex items-center gap-2">
              <button
                class="btn btn-sm variant-filled w-10 h-10 text-lg font-bold"
                on:click={() => movePoint("x", -1)}
                title="Move left one tile"
              >−</button>
              <div class="flex-1 input text-center py-2 text-sm font-mono">
                {selectedPoint.position[0].toFixed(1)}
                <span class="opacity-50 text-xs ml-1">(tile {tileX})</span>
              </div>
              <button
                class="btn btn-sm variant-filled w-10 h-10 text-lg font-bold"
                on:click={() => movePoint("x", +1)}
                title="Move right one tile"
              >+</button>
            </div>
          </div>

          <!-- Z axis stepper -->
          <div class="flex flex-col gap-1">
            <span class="text-sm font-medium">Z Axis</span>
            <div class="flex items-center gap-2">
              <button
                class="btn btn-sm variant-filled w-10 h-10 text-lg font-bold"
                on:click={() => movePoint("z", -1)}
                title="Move forward one tile"
              >−</button>
              <div class="flex-1 input text-center py-2 text-sm font-mono">
                {selectedPoint.position[2].toFixed(1)}
                <span class="opacity-50 text-xs ml-1">(tile {tileZ})</span>
              </div>
              <button
                class="btn btn-sm variant-filled w-10 h-10 text-lg font-bold"
                on:click={() => movePoint("z", +1)}
                title="Move backward one tile"
              >+</button>
            </div>
          </div>

          <!-- Y axis stepper -->
          {#if selectedIndex !== $controlPoints.length - 1}
            <div class="flex flex-col gap-1">
              <span class="text-sm font-medium">Y Axis (Height)</span>
              <div class="flex items-center gap-2">
                <button
                  class="btn btn-sm variant-filled w-10 h-10 text-lg font-bold"
                  on:click={() => movePoint("y", -1)}
                  disabled={selectedPoint.position[1] <= 0}
                  title="Move down"
                >−</button>
                <div class="flex-1 input text-center py-2 text-sm font-mono">
                  {selectedPoint.position[1].toFixed(1)}
                  <span class="opacity-50 text-xs ml-1">(units)</span>
                </div>
                <button
                  class="btn btn-sm variant-filled w-10 h-10 text-lg font-bold"
                  on:click={() => movePoint("y", +1)}
                  disabled={selectedPoint.position[1] >= 10}
                  title="Move up"
                >+</button>
              </div>
            </div>
          {/if}

          <p class="text-xs opacity-50 mt-1">
            Each step moves the point by one tile ({TILE_SIZE} units).
          </p>
        </div>
      {/if}

      {#if selectedIndex === 0 || selectedIndex === $controlPoints.length - 1}
        <div class="card p-4 variant-soft flex flex-col gap-3">
          <h4 class="h4 text-sm uppercase tracking-wider opacity-70">Block Properties</h4>
          <label class="label">
            <span class="text-xs">Shape</span>
            <select
              class="select text-sm"
              bind:value={selectedPoint.shape}
              on:change={(e) => {
                controlPoints.commit();
                $controlPoints[selectedIndex].shape = e.target.value;
                $controlPoints = [...$controlPoints];
              }}
            >
              <option value="square">Square</option>
              <option value="rounded">Rounded</option>
            </select>
          </label>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Level Inspector -->
    <h3 class="h3 mb-4">Level Settings</h3>
    <div class="flex flex-col gap-4">
      <label class="label">
        <span>Name</span>
        <input class="input" type="text" bind:value={$stage.name} placeholder="Level name" />
      </label>
      <label class="label">
        <span>Par</span>
        <input class="input" type="number" min="1" bind:value={$stage.par} />
      </label>
      <label class="label">
        <span>Skybox</span>
        <select class="select" bind:value={$stage.skybox}>
          <option value="default">Default</option>
        </select>
      </label>

      <hr class="opacity-50" />
      <h4 class="h4 text-sm uppercase tracking-wider opacity-70">Physics Materials</h4>
      
      <div class="grid grid-cols-2 gap-2">
        <label class="label">
          <span class="text-xs">Ground Friction</span>
          <input class="input text-sm" type="number" step="0.05" bind:value={$stage.groundFriction} />
        </label>
        <label class="label">
          <span class="text-xs">Ground Restitution</span>
          <input class="input text-sm" type="number" step="0.05" bind:value={$stage.groundRestitution} />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <label class="label">
          <span class="text-xs">Wall Friction</span>
          <input class="input text-sm" type="number" step="0.05" bind:value={$stage.wallFriction} />
        </label>
        <label class="label">
          <span class="text-xs">Wall Restitution</span>
          <input class="input text-sm" type="number" step="0.05" bind:value={$stage.wallRestitution} />
        </label>
      </div>
    </div>
  {/if}
</div>
