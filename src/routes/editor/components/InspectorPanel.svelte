<script>
  import { useEditor } from "../context";
  import { snapToGrid, TILE_SIZE } from "$lib/gridUtils";

  const { controlPoints, pointSelected, stage, blocks, blockSelected, transformMode } = useEditor();

  $: selectedIndex = $controlPoints.findIndex((p) => p.id === $pointSelected);
  $: selectedPoint = selectedIndex !== -1 ? $controlPoints[selectedIndex] : null;

  $: selectedBlockIndex = $blocks ? $blocks.findIndex((b) => b.id === $blockSelected) : -1;
  $: selectedBlock = selectedBlockIndex !== -1 ? $blocks[selectedBlockIndex] : null;

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
  {:else if selectedBlock}
    <!-- Custom Block Inspector -->
    <h3 class="h3 mb-4">Block Inspector</h3>
    <div class="flex flex-col gap-4">
      <div class="card p-4 variant-soft flex flex-col gap-3">
        <h4 class="h4 text-sm uppercase tracking-wider opacity-70">Properties</h4>
        <div class="text-sm">
          <strong>Type:</strong> <span class="capitalize">{selectedBlock.type}</span>
        </div>
        


        {#if selectedBlock.type === "bumper"}
          <label class="label mt-2">
            <span class="text-xs">Bounciness (Restitution)</span>
            <input
              class="input text-sm"
              type="number"
              step="0.1"
              bind:value={selectedBlock.restitution}
              on:change={(e) => {
                blocks.commit();
                $blocks[selectedBlockIndex].restitution = parseFloat(e.target.value);
                $blocks = [...$blocks];
              }}
            />
          </label>
        {/if}

        {#if selectedBlock.type === "boost"}
          <label class="label mt-2">
            <span class="text-xs">Boost Force</span>
            <input
              class="input text-sm"
              type="number"
              step="1"
              bind:value={selectedBlock.boostForce}
              on:change={(e) => {
                blocks.commit();
                $blocks[selectedBlockIndex].boostForce = parseFloat(e.target.value);
                $blocks = [...$blocks];
              }}
            />
          </label>
        {/if}
        
        <h4 class="h4 text-sm uppercase tracking-wider opacity-70 mt-2">Gizmo Mode</h4>
        <div class="flex gap-2">
          <button 
            class="btn btn-sm flex-1 { $transformMode === 'translate' ? 'variant-filled-primary' : 'variant-soft' }"
            on:click={() => $transformMode = 'translate'}
          >Move</button>
          <button 
            class="btn btn-sm flex-1 { $transformMode === 'rotate' ? 'variant-filled-primary' : 'variant-soft' }"
            on:click={() => $transformMode = 'rotate'}
          >Rotate</button>
          <button 
            class="btn btn-sm flex-1 { $transformMode === 'scale' ? 'variant-filled-primary' : 'variant-soft' }"
            on:click={() => $transformMode = 'scale'}
          >Scale</button>
        </div>
        <p class="text-xs opacity-50 mt-1">Shortcuts: T (Move), R (Rotate), E (Scale)</p>
      </div>
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
        <span>Theme</span>
        <select class="select" bind:value={$stage.theme}>
          <option value="clear">Clear Day</option>
          <option value="sunset">Sunset</option>
          <option value="night">Night</option>
          <option value="vaporwave">Vaporwave</option>
        </select>
      </label>
      <label class="label">
        <span>Tile Color</span>
        <input class="input h-10 w-full cursor-pointer p-1" type="color" bind:value={$stage.tileColor} />
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
