<script>
  import { createEventDispatcher } from "svelte";
  import ArcadeFrame from "$lib/components/ui/ArcadeFrame.svelte";
  import ArcadeButton from "$lib/components/ui/ArcadeButton.svelte";

  export let par = 3;
  export let strokes = 0;
  export let isCupSunk = false;

  const dispatch = createEventDispatcher();
</script>

<!-- Playtest Bottom Cartoon Wood HUD -->
<div class="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-3xl p-[3px] bg-[#2a1205] shadow-[0_6px_0_#2a1205,0_14px_28px_rgba(0,0,0,0.45)]">
  <div class="rounded-[1.35rem] bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 border-[3px] border-amber-300/90 px-5 py-2.5 text-white flex items-center gap-4">
    <div class="rounded-2xl bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-white shadow-[0_2px_0_#1e3a8a] px-3.5 py-1 text-center">
      <div class="text-[9px] font-black tracking-widest text-sky-100 uppercase">PAR</div>
      <div class="text-xl font-black text-white leading-tight drop-shadow">{par}</div>
    </div>

    <div class="rounded-2xl bg-gradient-to-b from-lime-400 to-emerald-600 border-2 border-white shadow-[0_2px_0_#14532d] px-3.5 py-1 text-center">
      <div class="text-[9px] font-black tracking-widest text-lime-100 uppercase">STROKES</div>
      <div class="text-xl font-black text-white leading-tight drop-shadow">{strokes}</div>
    </div>

    <ArcadeButton variant="purple" size="sm" on:click={() => dispatch("respawn")}>
      🔄 Respawn Ball
    </ArcadeButton>
  </div>
</div>

<!-- Celebratory Sink Modal -->
{#if isCupSunk}
  <div class="absolute inset-0 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 z-50">
    <ArcadeFrame
      title="HOLE IN!"
      titleWidthClass="w-56 md:w-[300px]"
      maxWidthClass="max-w-md"
    >
      <div class="rounded-2xl bg-amber-50/95 border-[3px] border-[#431407] p-6 shadow-[0_4px_0_#431407] text-center space-y-4">
        <div class="text-4xl">⛳ 🎉</div>
        <div class="text-lg font-black text-[#431407]">
          Total Strokes: <span class="text-amber-700">{strokes}</span>
          <span class="text-sm font-bold text-[#431407]/70">(Par {par})</span>
        </div>
        <div class="flex gap-3 justify-center pt-1">
          <ArcadeButton variant="green" size="md" on:click={() => dispatch("puttAgain")}>
            Putt Again
          </ArcadeButton>
          <ArcadeButton variant="amber" size="md" on:click={() => dispatch("exitPlaytest")}>
            Edit Track
          </ArcadeButton>
        </div>
      </div>
    </ArcadeFrame>
  </div>
{/if}
