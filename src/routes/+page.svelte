<script>
  import { onMount } from "svelte";

  import initAssetManager from "$lib/assets.js";
  import initAudioEngine from "$lib/audio.js";
  import initRenderingEngine from "$lib/graphics.js";
  import initPhysicsEngine from "$lib/physics.js";
  import Game from "$lib/game.js";
  import MainMenu from "../components/MainMenu.svelte";

  let canvas;
  let game;

  onMount(() => {
    Promise.all([
      initAudioEngine(),
      initAssetManager(),
      initPhysicsEngine(),
      initRenderingEngine(canvas),
    ]).then(([audio, assets, simulator, renderer]) => {
      game = new Game(audio, assets, renderer, simulator);
    });
  });

  $: if (game) {
    const gameloop = () => {
      requestAnimationFrame(gameloop);
      if (!game) return;

      // console.log(game);
      game.update();
    };
    gameloop();
  }
</script>

<div>
  <canvas class="webgl" bind:this={canvas} />
  {#if game}
    <MainMenu {game} />
  {/if}
</div>

<style>
  .webgl {
    width: 100vw;
    min-height: 100vh;
    overflow: hidden;
  }
</style>
