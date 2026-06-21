<script>
  import { scale } from "svelte/transition";
  import { backOut } from "svelte/easing";
  export let shots = 0;
  $: display = shots < 10 ? "0" + shots : shots;
</script>

<div class="flex items-center bg-surface-900/60 backdrop-blur-md rounded-full border border-white/10 shadow-lg p-1 pl-4 gap-3">
  <div class="font-mono font-bold text-2xl text-white drop-shadow-md min-w-[2.5rem] text-center">
    {#key shots}
      <div in:scale={{ duration: 300, start: 0.5, easing: backOut }} class="inline-block">
        {display}
      </div>
    {/key}
  </div>
  <div class="w-12 h-12 flex justify-center items-center rounded-full bg-gradient-to-br from-warning-400 to-warning-600 shadow-inner">
    <img src="/icons/ball.svg" alt="Ball" class="w-7 h-7 drop-shadow-md" />
  </div>
</div>
