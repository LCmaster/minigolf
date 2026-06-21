<script>
  import { interactivity } from "@threlte/extras";
  import Stage from "$lib/scene/Stage.svelte";

  export let course;
  export let current;

  interactivity();
</script>

{#each course.holes as level, i (i)}
  {#if i === current}
    <Stage controlPoints={level.holes[0].controlPoints} skybox={level.skybox || "default"} on:completed on:hit />
  {/if}
{/each}
