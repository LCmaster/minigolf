<script>
  import { T } from "@threlte/core";
  import { Canvas } from "@threlte/core";
  import { Debug, World } from "@threlte/rapier";
  import InGameScene from "../components/InGameScene.svelte";
  import InGameScreen from "../components/InGameScreen.svelte";
  import MainMenuScene from "../components/MainMenuScene.svelte";
  import MainMenuScreen from "../components/MainMenuScreen.svelte";

  let stage = "001";
  let type = "quick";
  let screen = "main-menu";
</script>

<div class="w-screen h-screen">
  <Canvas>
    <World gravity={[0, -15, 0]}>
      <!-- <Debug /> -->
      <T.AmbientLight color="#ffffff" intensity={1} />
      {#if screen === "main-menu"}
        <MainMenuScene />
      {:else if screen === "in-game"}
        <InGameScene />
      {/if}
    </World>
  </Canvas>

  {#if screen === "main-menu"}
    <MainMenuScreen
      on:startGame={(ev) => {
        stage = "001";
        type = ev.detail;
        screen = "in-game";
      }}
    />
  {:else if screen === "in-game"}
    <InGameScreen {stage} />
  {/if}
</div>
