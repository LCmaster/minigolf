<script>
  import { T } from "@threlte/core";
  import { Canvas } from "@threlte/core";
  import { Debug, World } from "@threlte/rapier";

  import { useGame } from "../useGame";

  import Stage from "./Stage.svelte";
  import MenuScene from "./MenuScene.svelte";

  const game = useGame();
  let world;
</script>

<Canvas>
  <World bind:this={world} gravity={[0, -15, 0]}>
    <Debug />
    <T.AmbientLight color="#ffffff" intensity={1} />
    {#if $game}
      <T.DirectionalLight
        color="#ffffff"
        intensity={2}
        position={[10, 10, 10]}
        castShadow
      />
      {#each $game.stages as stage, i (i)}
        {#if i === $game.current}
          <Stage scene={stage} on:completed on:hit />
        {/if}
      {/each}
    {:else}
      <MenuScene />
    {/if}
  </World>
</Canvas>
