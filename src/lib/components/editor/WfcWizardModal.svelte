<script>
  import { createEventDispatcher } from "svelte";
  import ArcadeFrame from "$lib/components/ui/ArcadeFrame.svelte";
  import ArcadeButton from "$lib/components/ui/ArcadeButton.svelte";

  export let isOpen = false;
  export let theme = "carnival_park";

  const dispatch = createEventDispatcher();

  let selectedPar = 3;
  let selectedStyle = "winding";
  let includeObstacles = true;

  function generate() {
    dispatch("generate", {
      par: selectedPar,
      style: selectedStyle,
      includeObstacles,
      theme,
    });
    isOpen = false;
  }

  function close() {
    isOpen = false;
    dispatch("close");
  }
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
    <ArcadeFrame
      title="AUTO GENERATOR"
      titleWidthClass="w-64 md:w-[340px]"
      maxWidthClass="max-w-md"
      showClose={true}
      closeLabel="Close WFC Hole Generator"
      on:close={close}
    >
      <div class="rounded-2xl bg-amber-50/95 border-[3px] border-[#431407] p-5 shadow-[0_4px_0_#431407] space-y-4 text-slate-900">
        <div class="flex items-center gap-2.5 pb-2 border-b-2 border-[#431407]/15">
          <span class="text-2xl">🤖</span>
          <div>
            <h3 class="font-black text-base text-[#431407]">WFC Hole Generator</h3>
            <p class="text-[11px] font-bold text-[#431407]/70">100% Guaranteed Solvable Track Layouts</p>
          </div>
        </div>

        <!-- Par Selection -->
        <div class="space-y-1.5">
          <span class="text-[11px] font-black text-[#431407] uppercase tracking-wider block">
            Target Par Difficulty
          </span>
          <div class="grid grid-cols-4 gap-2">
            {#each [2, 3, 4, 5] as p}
              <button
                on:click={() => (selectedPar = p)}
                class="py-2 rounded-xl border-2 text-xs font-black transition-all cursor-pointer {selectedPar === p ? 'bg-gradient-to-b from-sky-400 to-blue-600 border-[#1e3a8a] text-white shadow scale-105' : 'bg-white border-[#431407]/25 text-[#431407] hover:bg-amber-100'}"
              >
                Par {p}
              </button>
            {/each}
          </div>
        </div>

        <!-- Track Style Selection -->
        <div class="space-y-1.5">
          <span class="text-[11px] font-black text-[#431407] uppercase tracking-wider block">Course Style</span>
          <div class="grid grid-cols-3 gap-2">
            {#each [
              { id: "straightforward", label: "Classic", icon: "⛳" },
              { id: "winding", label: "Winding", icon: "🐍" },
              { id: "elevation", label: "3D Ramps", icon: "🎢" }
            ] as s}
              <button
                on:click={() => (selectedStyle = s.id)}
                class="flex flex-col items-center p-2.5 rounded-xl border-2 text-xs font-black transition-all cursor-pointer {selectedStyle === s.id ? 'bg-gradient-to-b from-lime-400 to-emerald-600 border-[#14532d] text-white shadow scale-105' : 'bg-white border-[#431407]/25 text-[#431407] hover:bg-amber-100'}"
              >
                <span class="text-xl mb-1">{s.icon}</span>
                <span>{s.label}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Kit Theme Selection -->
        <div class="space-y-1.5">
          <span class="text-[11px] font-black text-[#431407] uppercase tracking-wider block">Kit Theme</span>
          <div class="grid grid-cols-2 gap-2">
            {#each [
              { id: "carnival_park", label: "Carnival Park", icon: "🎪" },
              { id: "country_club", label: "Country Club", icon: "🏌️" }
            ] as t}
              <button
                on:click={() => (theme = t.id)}
                class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border-2 text-xs font-black transition-all cursor-pointer {theme === t.id ? 'bg-gradient-to-b from-amber-300 to-orange-500 border-[#78350f] text-[#431407] shadow scale-[1.02]' : 'bg-white border-[#431407]/25 text-[#431407] hover:bg-amber-100'}"
              >
                <span class="text-base">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Obstacles Toggle -->
        <label class="flex items-center justify-between p-3 rounded-xl bg-white border-2 border-[#431407]/25 cursor-pointer">
          <div class="flex items-center gap-2">
            <span class="text-lg">{theme === "carnival_park" ? "🌉" : "🎡"}</span>
            <span class="text-xs font-black text-[#431407]">
              {theme === "carnival_park" ? "Include Pond Bridge Crossing" : "Include Windmill Obstacle Gate"}
            </span>
          </div>
          <input type="checkbox" bind:checked={includeObstacles} class="w-4 h-4 accent-emerald-600 rounded cursor-pointer" />
        </label>

        <!-- Action Buttons -->
        <div class="flex gap-3 pt-1">
          <ArcadeButton variant="cream" size="md" extraClass="flex-1" on:click={close}>
            Cancel
          </ArcadeButton>
          <ArcadeButton variant="green" size="md" extraClass="flex-1" on:click={generate}>
            Generate Now ✨
          </ArcadeButton>
        </div>
      </div>
    </ArcadeFrame>
  </div>
{/if}
