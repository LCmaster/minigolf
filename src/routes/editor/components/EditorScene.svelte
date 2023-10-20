<script>
  import { MeshBasicMaterial } from "three";
  import { T } from "@threlte/core";
  import { interactivity, OrbitControls } from "@threlte/extras";
  import Block from "./Block.svelte";

  import { useEditor } from "../context";

  const { blocks, blockSelected } = useEditor();

  const groundMaterial = new MeshBasicMaterial({
    color: 0x99ccff,
  });
  const wallMaterial = new MeshBasicMaterial({
    color: "sandybrown",
  });

  function onRotateBlock(direction) {
    console.log("direction", direction);
    const selected = $blockSelected;
    let rotation = selected.rotation + direction * 0.5;
    if (rotation > 2) rotation -= 2;
    if (rotation < 0) rotation += 2;
    $blocks[$blockSelected] = { ...selected, rotation };
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
<T.PerspectiveCamera
  makeDefault
  fov={70}
  on:create={({ ref }) => {
    ref.position.set(5, 5, 5);
    ref.lookAt(0, 0, 0);
  }}
>
  <OrbitControls />
</T.PerspectiveCamera>
{#each $blocks as block (block.id)}
  <Block {...block} {groundMaterial} {wallMaterial} on:slotSelected />
{/each}
