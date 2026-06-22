<script>
  import { interactivity } from "@threlte/extras";
  import Stage from "$lib/scene/Stage.svelte";

  export let course;
  export let current;

  interactivity();
</script>

{#each course.holes as hole, i (i)}
  {#if i === current}
    <Stage 
      controlPoints={hole.controlPoints} 
      blocks={hole.blocks || []}
      theme={course.theme || "clear"} 
      on:completed 
      on:hit 
    />
  {/if}
{/each}
