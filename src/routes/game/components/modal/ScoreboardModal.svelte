<script>
  import { createEventDispatcher } from "svelte";
  import { fade, scale } from "svelte/transition";
  import { backOut } from "svelte/easing";
  import Leaderboards from "../ui/Leaderboards.svelte";
  import { useGame } from "../../context";

  const { course, current, shots } = useGame();

  let holes = $course.holes.map((_, index) => index + 1);
  let pars = $course.holes.map((level) => level.holes.reduce((sum, h) => sum + (h.par || 0), 0));

  const dispatch = createEventDispatcher();
</script>

<button
  transition:fade={{ duration: 200 }}
  on:click={() => dispatch("close")}
  class="fixed top-0 left-0 w-screen h-screen bg-black/60 backdrop-blur-sm z-40 border-none p-0 cursor-default"
/>
<div
  transition:scale={{ duration: 400, start: 0.9, easing: backOut }}
  class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-3xl bg-surface-900/80 backdrop-blur-lg border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-50 w-[90%] max-w-md overflow-hidden"
>
  <div class="relative bg-gradient-to-r from-primary-600 to-tertiary-600 py-6 px-8 text-center shadow-md">
    <h2 class="text-3xl font-black italic tracking-widest text-white drop-shadow-md">
      SCOREBOARD
    </h2>
  </div>
  
  <div class="p-6 flex flex-col gap-6">
    <Leaderboards current={$current} {holes} {pars} shots={$shots} />
    
    <button
      on:click={() => dispatch("close")}
      class="w-full py-4 rounded-xl font-bold text-lg tracking-wider bg-gradient-to-br from-primary-500 to-tertiary-500 text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
    >
      RESUME GAME
    </button>
  </div>
</div>
