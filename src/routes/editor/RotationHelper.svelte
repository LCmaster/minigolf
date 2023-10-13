<script>
  import { Group, MeshBasicMaterial } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import { createEventDispatcher } from "svelte";

  export let position = block.position;
  export let rotation = block.rotation;

  export const ref = new Group();
  const material = new MeshBasicMaterial({ color: 0xffffff });
  const gltf = useGltf("/editor/rotation_indicator.glb");

  const dispatch = createEventDispatcher();

  const component = forwardEventHandlers();
</script>

<T
  is={ref}
  {...$$restProps}
  bind:this={$component}
  {position}
  rotation={[0, -Math.PI * rotation, 0]}
>
  {#await gltf}
    <slot name="fallback" />
  {:then gltf}
    <T.Mesh
      geometry={gltf.nodes.arrow_cw.geometry}
      {material}
      on:click={(e) => {
        e.stopPropagation();
        dispatch("rotate", 1);
      }}
    />
    <T.Mesh
      geometry={gltf.nodes.arrow_ccw.geometry}
      {material}
      on:click={(e) => {
        e.stopPropagation();
        dispatch("rotate", -1);
      }}
    />
  {:catch error}
    <slot name="error" {error} />
  {/await}

  <slot {ref} />
</T>
