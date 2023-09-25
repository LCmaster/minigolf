<script lang="ts">
  import { T } from "@threlte/core";
  import { Canvas } from "@threlte/core";
  import { MeshStandardMaterial } from "three";
  import { Debug, World } from "@threlte/rapier";

  import MainMenuScene from "../components/MainMenuScene.svelte";
  import MainMenuScreen from "../components/MainMenuScreen.svelte";

  import Stage from "../components/Stage.svelte";
  import Player from "../components/Player.svelte";

  let stage = "Stage_001.glb";
  let type = "quick";
  let screen = "main-menu";

  const courseMaterial = new MeshStandardMaterial({
    color: 0x99ccff,
  });
  const groundMaterial = new MeshStandardMaterial({
    color: "seagreen",
  });

  let spawn: Array<number>;
  let stageCompleted = false;

  let hits = 0;
</script>

<div class="w-screen h-screen">
  <Canvas>
    <World gravity={[0, -15, 0]}>
      <!-- <Debug /> -->
      <T.AmbientLight color="#ffffff" intensity={1} />
      {#if screen === "main-menu"}
        <MainMenuScene />
      {:else if screen === "in-game"}
        <T.DirectionalLight
          color="#ffffff"
          intensity={2}
          position={[10, 10, 10]}
          castShadow
        />
        <T.Group>
          <Stage
            name={stage}
            {courseMaterial}
            {groundMaterial}
            bind:spawn
            on:completed={() => (stageCompleted = true)}
          />
          {#if spawn}
            {#if !stageCompleted}
              <Player
                position={[spawn[0], spawn[1] + 0.45, spawn[2]]}
                on:hit={() => hits++}
              />
            {/if}
          {/if}
        </T.Group>
      {/if}
    </World>
  </Canvas>

  {#if screen === "main-menu"}
    <MainMenuScreen
      on:startGame={(ev) => {
        stage = "Stage_001.glb";
        type = ev.detail;
        screen = "in-game";
      }}
    />
  {:else if screen === "in-game"}
    <!-- <InGameScreen {stage} /> -->
    <div class="fixed top-4 right-4">
      <h3>Hits</h3>
      <p>{hits}</p>
    </div>
    {#if stageCompleted}
      <div class="fixed top-0 left-0 w-screen h-screen p-8">
        <div class="h-full flex flex-col justify-center items-center">
          <div class="p-6 rounded-xl bg-white/50">
            <h2 class="font-bold text-6xl">Stage Complete</h2>
            <button
              on:click={() => {
                stageCompleted = false;
                stage = "Stage_001.glb";
                hits = 0;
              }}>Reset</button
            >
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
