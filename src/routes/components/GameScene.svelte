<script>
  import { T } from "@threlte/core";
  import { interactivity } from "@threlte/extras";
  import Stage from "$lib/scene/Stage.svelte";

  export let game;

  interactivity();
</script>

<T.DirectionalLight
  color="#ffffff"
  intensity={2}
  position={[10, 10, 10]}
  castShadow
/>

{#each game.course.holes as hole, i (i)}
  {#if i === game.current}
    <Stage blocks={hole.blocks} skybox={"default"} on:completed on:hit />
  {/if}
{/each}
