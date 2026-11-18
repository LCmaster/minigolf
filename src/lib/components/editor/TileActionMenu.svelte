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
  $: leftPx = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 310);
  $: topPx = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 800) - 380);

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

  <!-- Cartoon Wood Tile Action Popover -->
  <div
    class="fixed z-50 w-[296px] rounded-2xl p-[3px] bg-[#2a1205] shadow-[0_6px_0_#2a1205,0_14px_28px_rgba(0,0,0,0.45)] animate-in fade-in zoom-in-95 duration-100"
    style="left: {leftPx}px; top: {topPx}px;"
  >
    <div class="rounded-[0.85rem] bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 border-[2.5px] border-amber-300/90 p-3 text-white max-h-[82vh] overflow-y-auto space-y-2.5">
      <div class="text-[11px] font-black text-amber-200 uppercase tracking-wider pb-1.5 border-b border-amber-300/30 flex justify-between items-center gap-2">
        <div class="flex items-center gap-1.5 truncate">
          <span class="truncate">{tileInfo.name}</span>
          {#if tileInfo.isGap}
            <span class="px-1.5 py-0.5 rounded bg-sky-400 text-white border border-white text-[9px]">GAP</span>
          {/if}
        </div>
        <button on:click={closeMenu} class="text-amber-200 hover:text-white text-sm leading-none cursor-pointer">&times;</button>
      </div>

      <!-- Wall Toggles -->
      <div>
        <div class="text-[10px] font-black uppercase tracking-wider text-amber-200/80 mb-1">Walls &amp; Surface</div>
        <div class="grid grid-cols-2 gap-1.5">
          <button
            on:click={() => toggleWall("left")}
            disabled={tileInfo.isGap || !tileInfo.hasDynamicWalls}
            class="flex items-center justify-between px-2.5 py-1.5 rounded-xl border-2 text-xs font-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer {tileInfo.walls.left && !tileInfo.isGap ? 'bg-gradient-to-b from-lime-400 to-emerald-600 border-white text-white' : 'bg-black/30 border-amber-300/25 text-amber-100/70 hover:bg-black/45'}"
          >
            <span>🧱 Left</span>
            <span class="text-[10px]">{tileInfo.walls.left ? "ON" : "OFF"}</span>
          </button>
          <button
            on:click={() => toggleWall("right")}
            disabled={tileInfo.isGap || !tileInfo.hasDynamicWalls}
            class="flex items-center justify-between px-2.5 py-1.5 rounded-xl border-2 text-xs font-black transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer {tileInfo.walls.right && !tileInfo.isGap ? 'bg-gradient-to-b from-lime-400 to-emerald-600 border-white text-white' : 'bg-black/30 border-amber-300/25 text-amber-100/70 hover:bg-black/45'}"
          >
            <span>🧱 Right</span>
            <span class="text-[10px]">{tileInfo.walls.right ? "ON" : "OFF"}</span>
          </button>
        </div>

        {#if !tileInfo.isTee && !tileInfo.isCup}
          <button
            on:click={toggleGap}
            class="mt-1.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-black transition-all active:scale-95 cursor-pointer {tileInfo.isGap ? 'bg-gradient-to-b from-sky-400 to-blue-600 border-white text-white' : 'bg-amber-300 border-[#431407] text-[#431407] hover:brightness-110'}"
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
        <div class="pt-1 border-t border-amber-300/25 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-black uppercase tracking-wider text-amber-200/80">
              {tileInfo.isCup ? "Cup Variant" : "Change Tile Type"}
            </span>
            {#if !tileInfo.isCup && activeSection === "track"}
              <div class="flex bg-black/35 rounded-lg p-0.5 border border-amber-300/25 text-[9px] font-black">
                <button
                  on:click={() => (turnLeft = true)}
                  class="px-1.5 py-0.5 rounded transition cursor-pointer {turnLeft ? 'bg-amber-300 text-[#431407]' : 'text-amber-100/75 hover:text-white'}"
                  title="Turns curve Left"
                >
                  ↶ Left
                </button>
                <button
                  on:click={() => (turnLeft = false)}
                  class="px-1.5 py-0.5 rounded transition cursor-pointer {!turnLeft ? 'bg-amber-300 text-[#431407]' : 'text-amber-100/75 hover:text-white'}"
                  title="Turns curve Right"
                >
                  Right ↷
                </button>
              </div>
            {/if}
          </div>

          {#if !tileInfo.isCup}
            <div class="grid grid-cols-2 gap-1 bg-black/35 p-0.5 rounded-xl border border-amber-300/25 text-[10px] font-black">
              <button
                on:click={() => (activeSection = "track")}
                class="py-1 px-2 rounded-lg transition-all cursor-pointer {activeSection === 'track' ? 'bg-amber-300 text-[#431407]' : 'text-amber-100/75 hover:text-white'}"
              >
                🟩 Track
              </button>
              <button
                on:click={() => (activeSection = "hazards")}
                class="py-1 px-2 rounded-lg transition-all cursor-pointer {activeSection === 'hazards' ? 'bg-amber-300 text-[#431407]' : 'text-amber-100/75 hover:text-white'}"
              >
                ⚡ Hazards
              </button>
            </div>
          {/if}

          <div class="grid grid-cols-2 gap-1.5">
            {#each swapOptions as opt}
              <button
                on:click={() => swapType(opt)}
                class="flex items-center gap-1.5 p-2 rounded-xl border text-left text-[11px] font-black transition-all active:scale-95 group cursor-pointer {tileInfo.kitPieceId === opt.id && !tileInfo.isGap ? 'bg-amber-300 border-white text-[#431407]' : 'bg-black/30 hover:bg-amber-300 hover:text-[#431407] border-amber-300/25 text-white'}"
              >
                <span class="text-sm group-hover:scale-110 transition-transform">{opt.icon}</span>
                <span class="truncate">{opt.isTurn ? `${opt.label} ${turnLeft ? "L" : "R"}` : opt.label}</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
