<script>
  import { writable } from "svelte/store";

  import { T } from "@threlte/core";
  import { Canvas } from "@threlte/core";
  import { Debug, World } from "@threlte/rapier";

  import { useGame } from "../useGame";

  import Stage from "./Stage.svelte";
  import MenuScene from "./MenuScene.svelte";
  import { useGltf } from "@threlte/extras";

  const game = useGame();
  let world;

  function onStageCompleted() {
    console.log("Stage Completed");
    $game.status = completed;
  }
</script>

<Canvas>
  <World bind:this={world} gravity={[0, -15, 0]}>
    <!-- <Debug /> -->
    <T.AmbientLight color="#ffffff" intensity={1} />
    {#if $game}
      <T.DirectionalLight
        color="#ffffff"
        intensity={2}
        position={[10, 10, 10]}
        castShadow
      />
      {#await useGltf($game.stages[$game.current].file) then scene}
        <Stage {scene} on:completed={onStageCompleted} />
      {/await}
    {:else}
      <MenuScene />
    {/if}
  </World>
</Canvas>
