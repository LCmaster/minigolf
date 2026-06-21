<script lang="ts">
  import { Vector3 } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf } from "@threlte/extras";

  // === GRAPHICAL PROPERTIES === //
  export let color: string;
  export let position: Array<number>;
  export let target: Array<number>;

  const component = forwardEventHandlers();
  let ref: any;

  // Reactively calculate scale when position or target change
  $: positionVector = new Vector3(position[0], position[1], position[2]);
  $: targetVector = new Vector3(target[0], target[1], target[2]);
  $: scale = positionVector.distanceTo(targetVector) - 0.25;

  // Reactively update rotation when position, target, or ref change
  $: if (ref && position && target) {
    ref.lookAt(target[0], target[1], target[2]);
    ref.rotation.y += Math.PI;
  }
</script>

<T.Group
  {position}
  scale={[scale, scale, scale]}
  bind:ref
  {...$$restProps}
  bind:this={$component}
>
  {#await useGltf("/ForceArrow.glb") then gltf}
    <T.Mesh geometry={gltf.nodes.Arrow.geometry}>
      <T.MeshBasicMaterial {color} depthTest={false} renderOrder={9999} />
    </T.Mesh>
  {/await}
</T.Group>
