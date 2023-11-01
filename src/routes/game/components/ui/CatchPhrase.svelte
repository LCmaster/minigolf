<script>
  export let game;
  export let shots;
</script>

<p class="text-4xl text-center drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">
  {#if shots[game.current] === 1}
    Hole in one!
  {:else if game.course.holes[game.current].par > 2 && shots[game.current] === game.course.holes[game.current].par - 1}
    Birdie!
  {:else if shots[game.current] === game.course.holes[game.current].par}
    Par!
  {:else if shots[game.current] === game.course.holes[game.current].par + 1}
    Bogey!
  {:else}
    Well done!
  {/if}
</p>
