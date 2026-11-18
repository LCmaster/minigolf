<script>
  import { createEventDispatcher } from "svelte";
  import { getHazardOptions, getTrackSnapOptions } from "$lib/engine/kitbash/KitCatalog";

  export let x = 0;
  export let y = 0;
  export let socketInfo = null;
  export let theme = "carnival_park";

  const dispatch = createEventDispatcher();

  let activeSection = "track"; // "track" | "hazards"
  const hazardTileOptions = getHazardOptions();

  $: trackOptions = getTrackSnapOptions(theme);
  $: options = activeSection === "hazards" ? hazardTileOptions : trackOptions;
  $: leftPx = Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 240);
  $: topPx = Math.min(y, (typeof window !== "undefined" ? window.innerHeight : 800) - 340);

  function selectOption(pieceId) {
    dispatch("select", { socketInfo, pieceId });
  }

  function closeMenu() {
    dispatch("close");
  }
</script>

<!-- Backdrop to close on click outside -->
<div class="fixed inset-0 z-40" on:click={closeMenu} on:contextmenu|preventDefault={closeMenu}></div>

<!-- Cartoon Wood Snap Menu -->
<div
  class="fixed z-50 min-w-[230px] rounded-2xl p-[3px] bg-[#2a1205] shadow-[0_6px_0_#2a1205,0_14px_28px_rgba(0,0,0,0.45)] animate-in fade-in zoom-in-95 duration-100"
  style="left: {leftPx}px; top: {topPx}px;"
>
  <div class="rounded-[0.85rem] bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 border-[2.5px] border-amber-300/90 p-3 text-white space-y-2">
    <div class="text-[11px] font-black text-amber-200 uppercase tracking-wider pb-1 border-b border-amber-300/30 flex justify-between items-center gap-2">
      <span>Snap Next Piece</span>
      <button on:click={closeMenu} class="text-amber-200 hover:text-white cursor-pointer">&times;</button>
    </div>

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

    <div class="grid grid-cols-2 gap-1.5 pt-0.5">
      {#each options as opt}
        <button
          on:click={() => selectOption(opt.id)}
          class="flex items-center gap-2 p-2 rounded-xl bg-black/30 hover:bg-amber-300 hover:text-[#431407] border border-amber-300/25 text-left text-xs font-black transition-all active:scale-95 group cursor-pointer"
        >
          <span class="text-base group-hover:scale-110 transition-transform">{opt.icon}</span>
          <span class="truncate">{opt.label}</span>
        </button>
      {/each}
    </div>
  </div>
</div>
