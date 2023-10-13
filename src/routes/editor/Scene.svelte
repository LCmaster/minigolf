<script>
  import { writable } from "svelte/store";
  import { MeshBasicMaterial } from "three";
  import { T } from "@threlte/core";
  import { interactivity } from "@threlte/extras";
  import Block from "./Block.svelte";

  import { editor, blocks } from "./store";

  const groundMaterial = new MeshBasicMaterial({
    color: 0x99ccff,
  });
  const wallMaterial = new MeshBasicMaterial({
    color: "sandybrown",
  });

  interactivity();
</script>

{#each $blocks as block (block.position)}
  <Block {...block} {groundMaterial} {wallMaterial} on:slotSelected />
{/each}
<T.Mesh>
  <T.BoxGeometry args={[1000, 0.1, 1000]} />
  <T.MeshBasicMaterial color={"#567D46"} />
</T.Mesh>
