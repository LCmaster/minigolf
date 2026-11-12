<script>
  import { createEventDispatcher } from "svelte";
  import {
    getCupVariantOptions,
    getHazardOptions,
    getTrackSwapOptions,
  } from "$lib/engine/kitbash/KitCatalog";

  export let x = 0;
  export let y = 0;
  export let tileInfo = null; // TileClickInfo
  export let theme = "carnival_park";

  const dispatch = createEventDispatcher();

  let activeSection = "track"; // "track" | "hazards"
  let turnLeft = false;

  const hazardOptions = getHazardOptions();

  $: cupOptions = getCupVariantOptions(theme);
  $: baseTrackOptions = getTrackSwapOptions(theme);
  $: swapOptions = tileInfo?.isCup
    ? cupOptions
    : activeSection === "hazards"
      ? hazardOptions
      : baseTrackOptions;

  function closeMenu() {
    dispatch("close");
  }

  function toggleWall(side) {
    if (!tileInfo || tileInfo.isGap) return;
    dispatch("toggleWall", { tileInstanceId: tileInfo.tileInstanceId, side });
  }

  function toggleGap() {
    if (!tileInfo || tileInfo.isTee || tileInfo.isCup) return;
    dispatch("toggleGap", { tileInstanceId: tileInfo.tileInstanceId });
  }

  function swapType(opt) {
    if (!tileInfo || tileInfo.isTee) return;
    dispatch("swapType", {
      tileInstanceId: tileInfo.tileInstanceId,
      pieceId: opt.id,
      reverseDirection: Boolean(opt.isTurn && turnLeft),
    });
  }
</script>

{#if tileInfo}
  <!-- Backdrop to close on click outside -->
  <div class="fixed inset-0 z-40" on:click={closeMenu} on:contextmenu|preventDefault={closeMenu}></div>

  <!-- Tile Action Popover -->
  <div
    class="fixed z-50 bg-slate-900/95 backdrop-blur-xl border border-white/20 p-3 rounded-2xl shadow-2xl text-white font-mono w-[290px] max-h-[82vh] overflow-y-auto space-y-2.5 animate-in fade-in zoom-in-95 duration-100"
    style="left: {Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 310)}px; top: {Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 380)}px;"
  >
    <div class="text-[11px] font-bold text-cyan-400 uppercase tracking-wider pb-1.5 border-b border-white/10 flex justify-between items-center gap-2">
      <div class="flex items-center gap-1.5 truncate">
        <span class="truncate">{tileInfo.name}</span>
        {#if tileInfo.isGap}
          <span class="px-1.5 py-0.5 rounded bg-sky-500/25 text-sky-300 border border-sky-400/40 text-[9px]">GAP</span>
        {/if}
      </div>
      <button on:click={closeMenu} class="text-gray-400 hover:text-white text-sm leading-none">&times;</button>
    </div>

    <!-- Wall Toggles -->
    <div>
      <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Walls & Surface</div>
      <div class="grid grid-cols-2 gap-1.5">
        <button
          on:click={() => toggleWall("left")}
          disabled={tileInfo.isGap || !tileInfo.hasDynamicWalls}
          class="flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed {tileInfo.walls.left && !tileInfo.isGap ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}"
        >
          <span>🧱 Left</span>
          <span class="text-[10px]">{tileInfo.walls.left ? "ON" : "OFF"}</span>
        </button>
        <button
          on:click={() => toggleWall("right")}
          disabled={tileInfo.isGap || !tileInfo.hasDynamicWalls}
          class="flex items-center justify-between px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed {tileInfo.walls.right && !tileInfo.isGap ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}"
        >
          <span>🧱 Right</span>
          <span class="text-[10px]">{tileInfo.walls.right ? "ON" : "OFF"}</span>
        </button>
      </div>

      {#if !tileInfo.isTee && !tileInfo.isCup}
        <button
          on:click={toggleGap}
          class="mt-1.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 {tileInfo.isGap ? 'bg-cyan-500/25 hover:bg-cyan-500/35 border-cyan-400/60 text-cyan-200' : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-200'}"
        >
          {#if tileInfo.isGap}
            <span>🩹 Restore Tile Surface</span>
          {:else}
            <span>🕳️ Remove Tile (Create Jump Gap)</span>
          {/if}
        </button>
      {/if}
    </div>

    <!-- Swap Tile Type -->
    {#if !tileInfo.isTee}
      <div class="pt-1 border-t border-white/10 space-y-1.5">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {tileInfo.isCup ? "Cup Variant" : "Change Tile Type"}
          </span>
          {#if !tileInfo.isCup && activeSection === "track"}
            <div class="flex bg-black/40 rounded-lg p-0.5 border border-white/10 text-[9px] font-bold">
              <button
                on:click={() => (turnLeft = true)}
                class="px-1.5 py-0.5 rounded transition {turnLeft ? 'bg-cyan-500/30 text-cyan-200' : 'text-slate-400 hover:text-white'}"
                title="Turns curve Left"
              >
                ↶ Left
              </button>
              <button
                on:click={() => (turnLeft = false)}
                class="px-1.5 py-0.5 rounded transition {!turnLeft ? 'bg-cyan-500/30 text-cyan-200' : 'text-slate-400 hover:text-white'}"
                title="Turns curve Right"
              >
                Right ↷
              </button>
            </div>
          {/if}
        </div>

        {#if !tileInfo.isCup}
          <div class="grid grid-cols-2 gap-1 bg-black/30 p-0.5 rounded-xl border border-white/10 text-[10px] font-bold">
            <button
              on:click={() => (activeSection = "track")}
              class="py-1 px-2 rounded-lg transition-all {activeSection === 'track' ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40' : 'text-gray-400 hover:text-gray-200'}"
            >
              🟩 Track
            </button>
            <button
              on:click={() => (activeSection = "hazards")}
              class="py-1 px-2 rounded-lg transition-all {activeSection === 'hazards' ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40' : 'text-gray-400 hover:text-amber-200'}"
            >
              ⚡ Hazards
            </button>
          </div>
        {/if}

        <div class="grid grid-cols-2 gap-1.5">
          {#each swapOptions as opt}
            <button
              on:click={() => swapType(opt)}
              class="flex items-center gap-1.5 p-2 rounded-xl border text-left text-[11px] font-bold transition-all active:scale-95 group {tileInfo.kitPieceId === opt.id && !tileInfo.isGap ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200' : 'bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-400/50 border-white/10 text-white'}"
            >
              <span class="text-sm group-hover:scale-110 transition-transform">{opt.icon}</span>
              <span class="truncate">{opt.isTurn ? `${opt.label} ${turnLeft ? "L" : "R"}` : opt.label}</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}

