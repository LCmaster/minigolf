<script lang="ts">
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import { Group, MeshBasicMaterial, Vector3 } from "three";

  // === GRAPHICAL PROPERTIES === //
  export let color: string;
  export let position: Vector3;
  export let rotation: Vector3;

  const component = forwardEventHandlers();
  export const ref = new Group();
</script>

<T is={ref} {...$$restProps} bind:this={$component}>
  {#await useGltf("/ForceArrow.glb")}
    <slot name="fallback" />
  {:then gltf}
    <T.Group>
      <T.Mesh
        depthTest={false}
        renderOrder={9999}
        geometry={gltf.nodes.Arrow.geometry}
        material={new MeshBasicMaterial({ color })}
      />
    </T.Group>
  {:catch error}
    <slot name="error" {error} />
  {/await}

  <slot {ref} />
</T>
