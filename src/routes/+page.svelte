<script lang="ts">
  import { T } from "@threlte/core";
  import { Canvas } from "@threlte/core";
  import { Debug, World } from "@threlte/rapier";

  import MainMenuScene from "../components/MainMenuScene.svelte";
  import MainMenuScreen from "../components/MainMenuScreen.svelte";

  import Stage from "../components/Stage.svelte";
  import { startGame } from "../lib/game.js";

  let game = null;
</script>

<div class="w-screen h-screen">
  <Canvas>
    <World gravity={[0, -15, 0]}>
      <!-- <Debug /> -->
      <T.AmbientLight color="#ffffff" intensity={1} />
      {#if $game}
        <T.DirectionalLight
          color="#ffffff"
          intensity={2}
          position={[10, 10, 10]}
          castShadow
        />
        <Stage file={$game.stages[$game.current].file} />
      {:else}
        <MainMenuScene />
      {/if}
    </World>
  </Canvas>

  {#if game}
    <!-- <InGameScreen {stage} /> -->
    <div class="fixed top-4 right-4">
      <h3>Hits</h3>
      <p>0</p>
    </div>
    {#if $game.status !== "playing"}
      <div class="fixed top-0 left-0 w-screen h-screen p-8">
        <div class="h-full flex flex-col justify-center items-center">
          <div class="p-6 rounded-xl bg-white/50">
            <h2 class="font-bold text-6xl">Stage Complete</h2>
            <button>Next</button>
          </div>
        </div>
      </div>
    {/if}
  {:else}
    <MainMenuScreen
      on:startGame={(ev) => {
        game = startGame(ev.detail);
      }}
    />
  {/if}
</div>
