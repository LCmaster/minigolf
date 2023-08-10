<script>
  import { onMount } from "svelte";
  import Game from "$lib/game.js";

  let canvas;
  let game;

  onMount(() => {
    game = new Game(canvas);
    game.init().then(() => game.start());

    return () => game.dispose();
  });
</script>

<canvas class="webgl" bind:this={canvas} />

<style>
  .webgl {
    width: 100vw;
    min-height: 100vh;
    overflow: hidden;
  }
</style>
