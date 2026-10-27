<script>
  import { interactivity } from "@threlte/extras";
  import Stage from "$lib/scene/Stage.svelte";
  import { useGame } from "../../context";

  export let course;
  export let current;

  const { state } = useGame();

  interactivity();
</script>

{#each course.holes as hole, i (i)}
  {#if i === current}
    <Stage 
      controlPoints={hole.controlPoints} 
      blocks={hole.blocks || []}
      theme={hole.theme || course.theme || "clear"} 
      groundFriction={hole.groundFriction ?? 0.75}
      groundRestitution={hole.groundRestitution ?? 0.05}
      wallFriction={hole.wallFriction ?? 0.75}
      wallRestitution={hole.wallRestitution ?? 0.95}
      tileColor={hole.tileColor || "#567D46"}
      terrainMode={hole.terrainMode || "heightmap"}
      gameState={state}
      on:completed 
      on:hit 
    />
  {/if}
{/each}
