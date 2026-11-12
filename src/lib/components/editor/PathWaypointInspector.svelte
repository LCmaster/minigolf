<script>
  import { createEventDispatcher } from "svelte";

  export let selectedSplineNode = null;
  export let gridSnapSize = 1;

  const dispatch = createEventDispatcher();
</script>

{#if selectedSplineNode}
  <div class="absolute bottom-6 right-6 bg-slate-900/90 backdrop-blur-xl border border-cyan-400/30 p-3.5 rounded-2xl shadow-2xl text-white font-mono space-y-2.5 w-64">
    <div class="flex justify-between items-center border-b border-white/10 pb-1.5">
      <span class="text-xs font-bold text-cyan-300 uppercase tracking-wider">
        {#if selectedSplineNode.isRoot}
          ⛳ Tee Start (#0)
        {:else if selectedSplineNode.index === selectedSplineNode.nodeCount - 1}
          🏁 Path End (#{selectedSplineNode.index})
        {:else}
          〰️ Waypoint #{selectedSplineNode.index}
        {/if}
      </span>
      <span class="text-[11px] text-amber-300 font-bold">
        Y: {selectedSplineNode.elevationMeters.toFixed(1)}m
      </span>
    </div>

    {#if selectedSplineNode.invalidCount > 0}
      <div class="px-2.5 py-1.5 rounded-xl bg-red-500/20 border border-red-400/50 text-[10px] font-bold text-red-200 leading-snug">
        ⚠️ {selectedSplineNode.isInvalid ? 'This point is highlighted Red: ' : 'Red path points: '}unreachable with kit tiles. Track built up to last valid point.
      </div>
    {/if}

    <div class="grid grid-cols-2 gap-1.5 text-xs font-bold">
      <button
        on:click={() => dispatch("stepElevation", -1)}
        class="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition-colors"
        title="Lower elevation step (-1.5m)"
      >
        ⬇️ -1.5m
      </button>
      <button
        on:click={() => dispatch("stepElevation", 1)}
        class="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition-colors"
        title="Raise elevation step (+1.5m)"
      >
        ⬆️ +1.5m
      </button>
    </div>

    <div class="grid grid-cols-2 gap-1.5 text-xs font-bold">
      <button
        on:click={() => dispatch("toggleBevel")}
        disabled={!selectedSplineNode.canBevel}
        class="py-1.5 px-2 rounded-xl border transition-colors {!selectedSplineNode.canBevel ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed' : selectedSplineNode.bevelRadius > 0.15 ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200' : 'bg-amber-500/20 border-amber-400/50 text-amber-200'}"
        title="Toggle between Sharp corner turn and rounded Bevel arc"
      >
        {selectedSplineNode.bevelRadius > 0.15 ? `⭕ Bevel ${selectedSplineNode.bevelRadius.toFixed(1)}m` : '📐 Sharp'}
      </button>
      <button
        on:click={() => dispatch("deleteNode")}
        disabled={!selectedSplineNode.canDelete}
        class="py-1.5 px-2 rounded-xl border text-xs font-bold transition-colors {selectedSplineNode.canDelete ? 'bg-red-500/20 hover:bg-red-500/35 border-red-400/40 text-red-200' : 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'}"
        title="Delete selected waypoint (Del)"
      >
        🗑️ Del Node
      </button>
    </div>

    {#if selectedSplineNode.canBevel}
      <div class="grid grid-cols-2 gap-1.5 text-xs font-bold">
        <button
          on:click={() => dispatch("stepBevel", -3.0)}
          disabled={selectedSplineNode.bevelRadius <= 0.15}
          class="py-1 px-2 rounded-xl border transition-colors {selectedSplineNode.bevelRadius > 0.15 ? 'bg-white/5 hover:bg-white/15 border-white/10 text-gray-200' : 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'}"
          title="Decrease corner bevel radius (-3m)"
        >
          ➖ Bevel
        </button>
        <button
          on:click={() => dispatch("stepBevel", 3.0)}
          disabled={selectedSplineNode.bevelRadius >= selectedSplineNode.maxBevelRadius - 0.15}
          class="py-1 px-2 rounded-xl border transition-colors {selectedSplineNode.bevelRadius < selectedSplineNode.maxBevelRadius - 0.15 ? 'bg-white/5 hover:bg-white/15 border-white/10 text-gray-200' : 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'}"
          title="Increase corner bevel radius (+3m)"
        >
          ➕ Bevel
        </button>
      </div>
    {/if}

    <!-- World Grid Snap Selector -->
    <div class="pt-2 border-t border-white/10 space-y-1.5">
      <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        <span>⊞ World Grid Snap</span>
        <span class="text-cyan-300">{gridSnapSize > 0 ? `${gridSnapSize}m` : 'Off'}</span>
      </div>
      <div class="grid grid-cols-4 gap-1 bg-black/30 p-0.5 rounded-xl border border-white/10 text-[11px] font-bold">
        {#each [
          { size: 0, label: 'Off' },
          { size: 1, label: '1m' },
          { size: 3, label: '3m' },
          { size: 6, label: '6m' },
        ] as opt}
          <button
            on:click={() => dispatch("setGridSnap", opt.size)}
            class="py-1 rounded-lg transition-colors {gridSnapSize === opt.size ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50' : 'text-slate-400 hover:text-white'}"
          >
            {opt.label}
          </button>
        {/each}
      </div>
      {#if gridSnapSize > 0}
        <button
          on:click={() => dispatch("alignPath")}
          class="w-full py-1 px-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-xs font-bold text-cyan-200 transition-colors"
          title="Align all existing waypoints cleanly onto the active world grid"
        >
          🧲 Align Path to {gridSnapSize}m Grid
        </button>
      {/if}
    </div>
  </div>
{/if}

