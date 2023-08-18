<script>
  import { onMount } from "svelte";

  import {
    initAssetManager,
    initAudioEngine,
    initRenderingEngine,
    initPhysicsEngine,
    Game,
  } from "$lib";
  import MainMenuScreen from "../components/MainMenuScreen.svelte";
  import InGameScreen from "../components/InGameScreen.svelte";

  let canvas;
  let game;

  let gameState;

  let level = 1;
  let strokes = 0;

  onMount(() => {
    import("lil-gui").then((lil) => {
      let gui = null; //new lil.GUI();
      Promise.all([
        initAudioEngine(gui),
        initAssetManager(gui),
        initPhysicsEngine(gui),
        initRenderingEngine(gui, canvas),
      ]).then(([audio, assets, simulator, renderer]) => {
        game = new Game(
          gui,
          audio,
          assets,
          renderer,
          simulator,
          () => (strokes += 1),
          () => {
            console.log("YAAAYYYYYYY!!!");
          }
        );
      });
    });
  });

  $: if (game) {
    gameState = "main-menu";
    game.start();

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
  <!-- <div class="hud">
    <div class="hud-debug" />
    <div class="level">
      <h2>Level: {level}</h2>
    </div>
    <div class="strokes">
      <h2>Strokes: {strokes}</h2>
    </div>
  </div> -->
  {#if game}
    {#if gameState === "main-menu"}
      <MainMenuScreen {game} />
    {:else if gameState === "in-game"}
      <InGameScreen {game} />
    {/if}
  {/if}
</div>

<style>
  .webgl {
    width: 100vw;
    min-height: 100vh;
    overflow: hidden;
  }

  .hud .level {
    display: float;
    position: absolute;
    bottom: 64px;
    left: 64px;
  }

  .hud .strokes {
    position: fixed;
    bottom: 64px;
    right: 64px;
  }
</style>
