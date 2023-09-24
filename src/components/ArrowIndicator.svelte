<script lang="ts">
  import { MeshBasicMaterial, Vector3 } from "three";
  import { T, forwardEventHandlers, useFrame } from "@threlte/core";
  import { useGltf } from "@threlte/extras";

  // === GRAPHICAL PROPERTIES === //
  export let color: string;
  export let hitpoint: Array<number>;
  export let playerPosition: Array<number>;

  const component = forwardEventHandlers();
  let ref: any;

  useFrame(() => {
    if (!ref) return;
    ref.lookAt(playerPosition[0], playerPosition[1], playerPosition[2]);
    ref.rotation.y += Math.PI;

    let scaleVector = new Vector3();
    let indicatorPositionVector = new Vector3(
      hitpoint[0],
      hitpoint[1],
      hitpoint[2]
    );
    let playerPositionVector = new Vector3(
      playerPosition[0],
      playerPosition[1],
      playerPosition[2]
    );
    let scale =
      scaleVector
        .subVectors(indicatorPositionVector, playerPositionVector)
        .length() - 0.75;
    ref.scale.set(scale, scale, scale);
  });
</script>

<T.Group position={hitpoint} bind:ref {...$$restProps} bind:this={$component}>
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
