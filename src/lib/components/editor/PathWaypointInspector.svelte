<script>
  import { createEventDispatcher } from "svelte";

  export let selectedSplineNode = null;
  export let gridSnapSize = 1;

  const dispatch = createEventDispatcher();
</script>

{#if selectedSplineNode}
  <div class="absolute bottom-6 right-6 w-68 rounded-3xl p-[3px] bg-[#2a1205] shadow-[0_6px_0_#2a1205,0_14px_28px_rgba(0,0,0,0.45)]">
    <div class="rounded-[1.35rem] bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 border-[3px] border-amber-300/90 p-3.5 text-white space-y-2.5">
      <div class="flex justify-between items-center border-b border-amber-300/30 pb-1.5">
        <span class="text-xs font-black text-amber-200 uppercase tracking-wider">
          {#if selectedSplineNode.isRoot}
            ⛳ Tee Start (#0)
          {:else if selectedSplineNode.index === selectedSplineNode.nodeCount - 1}
            🏁 Path End (#{selectedSplineNode.index})
          {:else}
            〰️ Waypoint #{selectedSplineNode.index}
          {/if}
        </span>
        <span class="px-2 py-0.5 rounded-full bg-amber-300 text-[#431407] text-[11px] font-black">
          Y: {selectedSplineNode.elevationMeters.toFixed(1)}m
        </span>
      </div>

      {#if selectedSplineNode.invalidCount > 0}
        <div class="px-2.5 py-1.5 rounded-xl bg-rose-600/90 border-2 border-white text-[10px] font-black text-white leading-snug">
          ⚠️ {selectedSplineNode.isInvalid ? "This point is highlighted Red: " : "Red path points: "}unreachable with kit tiles. Track built up to last valid point.
        </div>
      {/if}

      <div class="grid grid-cols-2 gap-1.5 text-xs font-black">
        <button
          on:click={() => dispatch("stepElevation", -1)}
          class="py-1.5 px-2 rounded-xl bg-black/30 hover:bg-black/45 border border-amber-300/35 text-amber-100 transition-colors cursor-pointer"
          title="Lower elevation step (-1.5m)"
        >
          ⬇️ -1.5m
        </button>
        <button
          on:click={() => dispatch("stepElevation", 1)}
          class="py-1.5 px-2 rounded-xl bg-black/30 hover:bg-black/45 border border-amber-300/35 text-amber-100 transition-colors cursor-pointer"
          title="Raise elevation step (+1.5m)"
        >
          ⬆️ +1.5m
        </button>
      </div>

      <div class="grid grid-cols-2 gap-1.5 text-xs font-black">
        <button
          on:click={() => dispatch("toggleBevel")}
          disabled={!selectedSplineNode.canBevel}
          class="py-1.5 px-2 rounded-xl border-2 transition-colors cursor-pointer {!selectedSplineNode.canBevel ? 'bg-black/20 border-white/10 text-amber-200/35 cursor-not-allowed' : selectedSplineNode.bevelRadius > 0.15 ? 'bg-gradient-to-b from-sky-400 to-blue-600 border-white text-white' : 'bg-gradient-to-b from-amber-300 to-orange-500 border-white text-[#431407]'}"
          title="Toggle between Sharp corner turn and rounded Bevel arc"
        >
          {selectedSplineNode.bevelRadius > 0.15 ? `⭕ Bevel ${selectedSplineNode.bevelRadius.toFixed(1)}m` : "📐 Sharp"}
        </button>
        <button
          on:click={() => dispatch("deleteNode")}
          disabled={!selectedSplineNode.canDelete}
          class="py-1.5 px-2 rounded-xl border-2 text-xs font-black transition-colors cursor-pointer {selectedSplineNode.canDelete ? 'bg-gradient-to-b from-rose-400 to-red-600 border-white text-white hover:brightness-110' : 'bg-black/20 border-white/10 text-amber-200/35 cursor-not-allowed'}"
          title="Delete selected waypoint (Del)"
        >
          🗑️ Del Node
        </button>
      </div>

      {#if selectedSplineNode.canBevel}
        <div class="grid grid-cols-2 gap-1.5 text-xs font-black">
          <button
            on:click={() => dispatch("stepBevel", -3.0)}
            disabled={selectedSplineNode.bevelRadius <= 0.15}
            class="py-1 px-2 rounded-xl border border-amber-300/35 transition-colors cursor-pointer {selectedSplineNode.bevelRadius > 0.15 ? 'bg-black/30 hover:bg-black/45 text-amber-100' : 'bg-black/15 border-white/10 text-amber-200/35 cursor-not-allowed'}"
            title="Decrease corner bevel radius (-3m)"
          >
            ➖ Bevel
          </button>
          <button
            on:click={() => dispatch("stepBevel", 3.0)}
            disabled={selectedSplineNode.bevelRadius >= selectedSplineNode.maxBevelRadius - 0.15}
            class="py-1 px-2 rounded-xl border border-amber-300/35 transition-colors cursor-pointer {selectedSplineNode.bevelRadius < selectedSplineNode.maxBevelRadius - 0.15 ? 'bg-black/30 hover:bg-black/45 text-amber-100' : 'bg-black/15 border-white/10 text-amber-200/35 cursor-not-allowed'}"
            title="Increase corner bevel radius (+3m)"
          >
            ➕ Bevel
          </button>
        </div>
      {/if}

      <!-- World Grid Snap Selector -->
      <div class="pt-2 border-t border-amber-300/25 space-y-1.5">
        <div class="flex items-center justify-between text-[10px] text-amber-200 font-black uppercase tracking-wider">
          <span>⊞ World Grid Snap</span>
          <span class="text-white">{gridSnapSize > 0 ? `${gridSnapSize}m` : "Off"}</span>
        </div>
        <div class="grid grid-cols-4 gap-1 bg-black/35 p-0.5 rounded-xl border border-amber-300/25 text-[11px] font-black">
          {#each [
            { size: 0, label: "Off" },
            { size: 1, label: "1m" },
            { size: 3, label: "3m" },
            { size: 6, label: "6m" },
          ] as opt}
            <button
              on:click={() => dispatch("setGridSnap", opt.size)}
              class="py-1 rounded-lg transition-colors cursor-pointer {gridSnapSize === opt.size ? 'bg-amber-300 text-[#431407]' : 'text-amber-100/75 hover:text-white'}"
            >
              {opt.label}
            </button>
          {/each}
        </div>
        {#if gridSnapSize > 0}
          <button
            on:click={() => dispatch("alignPath")}
            class="w-full py-1.5 px-2 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-white text-xs font-black text-white shadow hover:brightness-110 transition-all cursor-pointer"
            title="Align all existing waypoints cleanly onto the active world grid"
          >
            🧲 Align Path to {gridSnapSize}m Grid
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
