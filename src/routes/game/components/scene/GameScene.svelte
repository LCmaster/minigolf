<script>
  import { interactivity } from "@threlte/extras";
  import Stage from "$lib/scene/Stage.svelte";
  import { useGame } from "../../context";

  export let course;
  export let current;

  interactivity();
</script>

{#each course.holes as hole, i (i)}
  {#if i === current}
    <Stage blocks={hole.blocks} skybox={"default"} on:completed on:hit />
  {/if}
{/each}
