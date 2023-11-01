<script>
  export let shots;
  export let par;
</script>

<p class="text-4xl text-center drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">
  {#if shots === 1}
    Hole in one!
  {:else if par > 2 && shots === par - 1}
    Birdie!
  {:else if shots === par}
    Par!
  {:else if shots === par + 1}
    Bogey!
  {:else}
    Well done!
  {/if}
</p>
