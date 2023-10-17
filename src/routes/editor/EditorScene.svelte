<script>
  import { MeshBasicMaterial } from "three";
  import { T } from "@threlte/core";
  import { interactivity, OrbitControls } from "@threlte/extras";
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
    const blockSelected = $blocks[$editor.selected];
    let rotation = blockSelected.rotation + direction * 0.5;
    if (rotation > 2) rotation -= 2;
    if (rotation < 0) rotation += 2;
    $blocks[$editor.selected] = { ...blockSelected, rotation };
  }

  $: selectedBlock = $blocks[$editor.selected];

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
    ref.position.set(-5, 5, 5);
    ref.lookAt(0, 0, 0);
  }}
>
  <OrbitControls />
</T.PerspectiveCamera>
{#each $blocks as block, i (i)}
  <Block id={i} {...block} {groundMaterial} {wallMaterial} on:slotSelected />
{/each}
<!-- <T.Mesh
  on:click={() => {
    $editor.selected = null;
  }}
>
  <T.BoxGeometry args={[1000, 0.1, 1000]} />
  <T.MeshBasicMaterial color={"#567D46"} />
</T.Mesh> -->
