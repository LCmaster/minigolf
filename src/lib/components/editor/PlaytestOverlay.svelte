<script>
  import { createEventDispatcher } from "svelte";

  export let par = 3;
  export let strokes = 0;
  export let isCupSunk = false;

  const dispatch = createEventDispatcher();
</script>

<!-- Playtest Bottom HUD -->
<div class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 text-white font-mono shadow-2xl flex items-center gap-6">
  <div class="text-center">
    <div class="text-[10px] text-gray-400">PAR</div>
    <div class="text-lg font-bold text-cyan-400">{par}</div>
  </div>
  <div class="w-px h-6 bg-white/10"></div>
  <div class="text-center">
    <div class="text-[10px] text-gray-400">STROKES</div>
    <div class="text-lg font-bold text-amber-400">{strokes}</div>
  </div>
  <div class="w-px h-6 bg-white/10"></div>
  <button
    on:click={() => dispatch("respawn")}
    class="bg-white/10 hover:bg-white/20 text-xs font-bold px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
  >
    Respawn Ball
  </button>
</div>

<!-- Celebratory Sink Modal -->
{#if isCupSunk}
  <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
    <div class="bg-black/90 backdrop-blur-xl border border-emerald-500/50 p-8 rounded-3xl text-center shadow-2xl pointer-events-auto space-y-4">
      <div class="text-5xl">⛳ 🎉</div>
      <div class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 font-sans">
        HOLE IN!
      </div>
      <div class="text-lg text-white font-mono">
        Total Strokes: <span class="font-bold text-amber-400">{strokes}</span>
      </div>
      <div class="flex gap-3 justify-center">
        <button
          on:click={() => dispatch("puttAgain")}
          class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl transition-all"
        >
          Putt Again
        </button>
        <button
          on:click={() => dispatch("exitPlaytest")}
          class="bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-2 rounded-xl transition-all"
        >
          Edit Track
        </button>
      </div>
    </div>
  </div>
{/if}

