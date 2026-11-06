<script>
  import { createEventDispatcher } from "svelte";

  export let isOpen = false;

  const dispatch = createEventDispatcher();

  let selectedPar = 3;
  let selectedStyle = "winding";
  let includeObstacles = true;

  function generate() {
    dispatch("generate", {
      par: selectedPar,
      style: selectedStyle,
      includeObstacles,
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
  <div class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
    <!-- Modal Card -->
    <div class="bg-slate-900 border border-white/20 p-6 rounded-3xl max-w-md w-full shadow-2xl text-white font-mono space-y-6 animate-in zoom-in-95 duration-150">
      <div class="flex justify-between items-center pb-2 border-b border-white/10">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🤖</span>
          <div>
            <h3 class="font-bold text-lg font-sans text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              WFC Hole Generator
            </h3>
            <p class="text-xs text-gray-400 font-mono">100% Guaranteed Solvable Track Layouts</p>
          </div>
        </div>
        <button on:click={close} class="text-gray-400 hover:text-white text-xl">&times;</button>
      </div>

      <!-- Par Selection -->
      <div class="space-y-2">
        <label class="text-xs font-bold text-gray-300 uppercase tracking-wider">Target Par Difficulty</label>
        <div class="grid grid-cols-4 gap-2">
          {#each [2, 3, 4, 5] as p}
            <button
              on:click={() => (selectedPar = p)}
              class="py-2.5 rounded-xl border text-sm font-bold transition-all {selectedPar === p ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-lg scale-105' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}"
            >
              Par {p}
            </button>
          {/each}
        </div>
      </div>

      <!-- Track Style Selection -->
      <div class="space-y-2">
        <label class="text-xs font-bold text-gray-300 uppercase tracking-wider">Course Style</label>
        <div class="grid grid-cols-3 gap-2">
          {#each [
            { id: "straightforward", label: "Classic", icon: "⛳" },
            { id: "winding", label: "Winding", icon: "🐍" },
            { id: "elevation", label: "3D Ramps", icon: "🎢" }
          ] as s}
            <button
              on:click={() => (selectedStyle = s.id)}
              class="flex flex-col items-center p-3 rounded-xl border text-xs font-bold transition-all {selectedStyle === s.id ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-lg scale-105' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}"
            >
              <span class="text-xl mb-1">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Obstacles Toggle -->
      <label class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
        <div class="flex items-center gap-2">
          <span class="text-lg">🎡</span>
          <span class="text-xs font-bold text-gray-300">Include Windmill Obstacle Gate</span>
        </div>
        <input type="checkbox" bind:checked={includeObstacles} class="w-4 h-4 accent-cyan-400 rounded cursor-pointer" />
      </label>

      <!-- Action Buttons -->
      <div class="flex gap-3 pt-2">
        <button
          on:click={close}
          class="flex-1 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition-colors"
        >
          Cancel
        </button>
        <button
          on:click={generate}
          class="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white text-xs font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-1.5"
        >
          <span>Generate Now</span>
          <span>✨</span>
        </button>
      </div>
    </div>
  </div>
{/if}

