<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { fade, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";
  import Leaderboards from "../ui/Leaderboards.svelte";
  import CatchPhrase from "../ui/CatchPhrase.svelte";
  import { useGame } from "../../context";

  const { course, current, shots } = useGame();

  let holes = $course.holes.map((_, index) => index + 1);
  let pars = $course.holes.map((hole) => hole.par || 0);

  const dispatch = createEventDispatcher();
</script>

<div 
  transition:fade={{ duration: 200 }}
  class="fixed top-0 left-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-40" 
/>

<div
  transition:scale={{ duration: 500, start: 0.8, easing: backOut }}
  class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-3xl bg-surface-900/80 backdrop-blur-lg border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.6)] z-50 w-[90%] max-w-md overflow-hidden"
>
  <div class="relative bg-gradient-to-r from-success-600 to-primary-600 py-6 px-8 text-center shadow-md">
    <h2 class="text-3xl font-black italic tracking-widest text-white drop-shadow-md">
      HOLE COMPLETE
    </h2>
  </div>

  <div class="p-6 flex flex-col gap-4">
    <CatchPhrase shots={$shots[$current]} par={pars[$current]} />

    <Leaderboards current={$current} {holes} {pars} shots={$shots} />
    
    <div class="flex justify-center mt-4 gap-4" class:justify-between={$current < holes.length - 1}>
      <button
        class="flex-1 flex flex-col justify-center items-center py-3 rounded-xl bg-surface-700/50 hover:bg-surface-600/50 border border-white/5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        on:click={() => dispatch("quit")}
      >
        <img src="/icons/home.svg" alt="Home" class="w-6 h-6 mb-1 opacity-80" />
        <span class="text-sm font-bold text-white/80 tracking-wide uppercase">Exit</span>
      </button>

      {#if $current < holes.length - 1}
        <button
          class="flex-[2] flex flex-col justify-center items-center py-3 rounded-xl bg-gradient-to-br from-success-400 to-success-600 shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          on:click={() => dispatch("next")}
        >
          <img src="/icons/next.svg" alt="Next" class="w-8 h-8 mb-1 drop-shadow-md" />
          <span class="text-sm font-black text-white tracking-widest uppercase drop-shadow-sm">Next Hole</span>
        </button>
      {/if}
    </div>
  </div>
</div>
