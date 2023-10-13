<script>
  import { MeshBasicMaterial } from "three";
  import { T } from "@threlte/core";
  import { interactivity } from "@threlte/extras";
  import Block from "./Block.svelte";

  import { editor, blocks } from "./store";
  import RotationHelper from "./RotationHelper.svelte";

  const groundMaterial = new MeshBasicMaterial({
    color: 0x99ccff,
  });
  const wallMaterial = new MeshBasicMaterial({
    color: "sandybrown",
  });

  function onRotateBlock(direction) {
    console.log("direction", direction);
    const currentRotation = $blocks[$editor.selected].rotation;
    $blocks[$editor.selected].rotation = currentRotation + direction * 0.5;
  }

  interactivity();
</script>

<T.AmbientLight color="#ffffff" intensity={1} />
<T.DirectionalLight
  color="#ffffff"
  intensity={2}
  position={[10, 10, 10]}
  castShadow
/>
{#each $blocks as block, i (i)}
  <Block id={i} {...block} {groundMaterial} {wallMaterial} on:slotSelected />
{/each}
{#if $editor.selected}
  {@const position = $blocks[$editor.selected].position}
  <RotationHelper
    {position}
    on:rotate={(ev) => {
      onRotateBlock(ev.detail);
    }}
  />
{/if}
<T.Mesh
  on:click={() => {
    $editor.selected = null;
  }}
>
  <T.BoxGeometry args={[1000, 0.1, 1000]} />
  <T.MeshBasicMaterial color={"#567D46"} />
</T.Mesh>
