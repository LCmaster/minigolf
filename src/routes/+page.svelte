<script>
  import MainMenu from "../components/MainMenu.svelte";

  import { onMount } from "svelte";

  import {
    initAssetManager,
    initAudioEngine,
    initRenderingEngine,
    initPhysicsEngine,
    Game,
  } from "$lib";

  let canvas;
  let game;

  onMount(() => {
    import("lil-gui").then((lil) => {
      let gui = null; //new lil.GUI();
      Promise.all([
        initAudioEngine(gui),
        initAssetManager(gui),
        initPhysicsEngine(gui),
        initRenderingEngine(gui, canvas),
      ]).then(([audio, assets, simulator, renderer]) => {
        game = new Game(gui, audio, assets, renderer, simulator);
      });
    });
  });

  $: if (game) {
    const gameloop = () => {
      requestAnimationFrame(gameloop);
      if (!game) return;

      game.update();
    };
    gameloop();
  }
</script>

<div>
  <canvas class="webgl" bind:this={canvas} />
  <div class="hud">
    <div class="hud-debug" />
  </div>
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
