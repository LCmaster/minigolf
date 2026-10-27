<script>
  import { useEditor } from "../context";
  import { ProceduralGenerator } from "$lib/ProceduralGenerator";

  const {
    controlPoints,
    pointSelected,
    blocks,
    blockSelected,
    stage,
    extendTrack,
    insertPointAfterSelected,
    deleteSelected,
  } = useEditor();

  $: selectedIndex = $controlPoints.findIndex((p) => p.id === $pointSelected);
  $: selectedPoint =
    selectedIndex !== -1 ? $controlPoints[selectedIndex] : null;

  $: selectedBlockIndex = $blocks
    ? $blocks.findIndex((b) => b.id === $blockSelected)
    : -1;
  $: selectedBlock =
    selectedBlockIndex !== -1 ? $blocks[selectedBlockIndex] : null;
</script>

<div
  id="sidebar-left"
  class="w-64 h-full flex flex-col bg-surface-900/90 backdrop-blur-md border-r border-surface-500/30 text-white select-none"
>
  <!-- Quick Track Sculpt Actions -->
  <div class="p-3 border-b border-surface-500/30 flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <span class="text-xs font-bold uppercase tracking-wider text-surface-300">
        Track Builder
      </span>
      <button
        type="button"
        class="text-xs px-2 py-0.5 rounded bg-surface-700 hover:bg-surface-600 text-surface-200 transition"
        title="Open Level & Physics Settings"
        on:click={() => {
          $pointSelected = null;
          $blockSelected = null;
        }}
      >
        ⚙ Settings
      </button>
    </div>

    <div class="grid grid-cols-2 gap-1.5">
      <button
        type="button"
        class="btn btn-sm variant-filled-primary text-xs font-semibold py-1.5"
        title="Extend track forward along the current direction (Shortcut: A)"
        on:click={extendTrack}
      >
        + Extend (A)
      </button>
      <button
        type="button"
        class="btn btn-sm variant-soft-primary text-xs font-semibold py-1.5"
        title="Insert a new control point on the active segment (Shortcut: I)"
        on:click={insertPointAfterSelected}
      >
        + Subdivide (I)
      </button>
    </div>

    <p class="text-[11px] text-surface-300 leading-tight bg-surface-800/70 rounded px-2 py-1.5 border border-surface-500/20">
      💡 <strong>Double-click</strong> anywhere on the terrain to stamp a new point, or drag points with the 3D arrows.
    </p>
  </div>

  <!-- Outliner Lists -->
  <div class="p-3 flex-grow overflow-y-auto flex flex-col gap-4">
    <div>
      <div class="flex items-center justify-between mb-2">
        <h4 class="text-xs font-bold uppercase tracking-wider text-surface-300">
          Spline Points ({$controlPoints.length})
        </h4>
      </div>
      <div class="flex flex-col gap-1">
        {#each $controlPoints as point, index (point.id)}
          <button
            type="button"
            class="w-full px-2.5 py-1.5 rounded text-left text-xs flex items-center justify-between transition {point.id ===
            $pointSelected
              ? 'bg-primary-500 text-white font-semibold shadow-sm'
              : 'bg-surface-800/60 hover:bg-surface-700/80 text-surface-200'}"
            on:click={() => {
              $pointSelected = point.id;
              $blockSelected = null;
            }}
          >
            <span class="flex items-center gap-1.5 truncate">
              {#if index === 0}
                <span class="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Tee (Start)</span>
              {:else if index === $controlPoints.length - 1}
                <span class="inline-block w-2 h-2 rounded-full bg-rose-400"></span>
                <span>Hole (Pin)</span>
              {:else}
                <span class="inline-block w-2 h-2 rounded-full bg-sky-400"></span>
                <span>Point {index + 1}</span>
              {/if}
            </span>

            <span class="flex items-center gap-1 font-mono text-[10px] opacity-80">
              {#if (point.bankAngle ?? 0) !== 0}
                <span class="px-1 rounded bg-pink-500/30 text-pink-200">
                  {point.bankAngle > 0 ? `+${point.bankAngle}°` : `${point.bankAngle}°`}
                </span>
              {/if}
              <span>Y:{point.position[1].toFixed(1)}</span>
            </span>
          </button>
        {/each}
      </div>
    </div>

    {#if $blocks && $blocks.length > 0}
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-surface-300 mb-2">
          Placed Objects ({$blocks.length})
        </h4>
        <div class="flex flex-col gap-1">
          {#each $blocks as block, index (block.id)}
            <button
              type="button"
              class="w-full px-2.5 py-1.5 rounded text-left text-xs flex items-center justify-between transition {block.id ===
              $blockSelected
                ? 'bg-primary-500 text-white font-semibold shadow-sm'
                : 'bg-surface-800/60 hover:bg-surface-700/80 text-surface-200'}"
              on:click={() => {
                $blockSelected = block.id;
                $pointSelected = null;
              }}
            >
              <span class="capitalize truncate">
                {index + 1}. {block.type || "Object"}
              </span>
              <span class="font-mono text-[10px] opacity-70">
                ({block.position[0].toFixed(0)}, {block.position[2].toFixed(0)})
              </span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Bottom Actions -->
  <div class="p-3 flex-shrink-0 border-t border-surface-500/30 flex flex-col gap-1.5">
    <button
      type="button"
      class="w-full btn btn-sm variant-soft-secondary text-xs"
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
      🎲 Generate Random Hole
    </button>
    <button
      type="button"
      class="w-full btn btn-sm variant-filled-error text-xs"
      on:click={deleteSelected}
      disabled={(!selectedPoint || selectedIndex === 0 || $controlPoints.length <= 2) && !selectedBlock}
      title="Shortcut: Delete or Backspace"
    >
      🗑 Delete Selected (Del)
    </button>
  </div>
</div>
