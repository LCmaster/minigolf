<script lang="ts">
  import { MeshBasicMaterial, Vector3 } from "three";
  import { T, forwardEventHandlers, useFrame } from "@threlte/core";
  import { useGltf } from "@threlte/extras";

  // === GRAPHICAL PROPERTIES === //
  export let color: string;
  export let position: Array<number>;
  export let target: Array<number>;

  $: positionVector = new Vector3(position[0], position[1], position[2]);
  $: targetVector = new Vector3(target[0], target[1], target[2]);

  const component = forwardEventHandlers();
  let ref: any;

  useFrame(() => {
    if (!ref) return;
    ref.lookAt(target[0], target[1], target[2]);
    ref.rotation.y += Math.PI;

    let scaleVector = new Vector3();

    let scale =
      scaleVector.subVectors(positionVector, targetVector).length() - 0.25;
    ref.scale.set(scale, scale, scale);
  });
</script>

<T.Group {position} bind:ref {...$$restProps} bind:this={$component}>
  {#await useGltf("/ForceArrow.glb") then gltf}
    <T.Mesh
      geometry={gltf.nodes.Arrow.geometry}
      material={new MeshBasicMaterial({
        color,
        depthTest: false,
        renderOrder: 9999,
      })}
    />
  {/await}
</T.Group>
