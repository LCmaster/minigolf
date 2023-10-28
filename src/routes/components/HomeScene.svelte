<script>
  import { Group } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf } from "@threlte/extras";

  export const ref = new Group();

  const gltf = useGltf("/menu_scene.glb");

  const component = forwardEventHandlers();
</script>

<T is={ref} dispose={false} {...$$restProps} bind:this={$component}>
  {#await gltf}
    <slot name="fallback" />
  {:then gltf}
    <T.Mesh
      geometry={gltf.nodes.mini.geometry}
      material={gltf.materials["Material.001"]}
      position={[1.48, -2.72, -20]}
      scale={15.23}
    />
    <T.Mesh
      geometry={gltf.nodes.floor.geometry}
      material={gltf.materials["Material.002"]}
      scale={1000}
    />
    <T.Mesh
      geometry={gltf.nodes.Cube.geometry}
      material={gltf.materials["Material.004"]}
      position={[4.11, 0, 20]}
      scale={[50, 1, 2.5]}
    />
    <T.Group position={[0, 0.4, 0]} rotation={[0, 1.57, 0]}>
      <T.Mesh
        geometry={gltf.nodes.Cube031.geometry}
        material={gltf.materials.floor}
      />
      <T.Mesh
        geometry={gltf.nodes.Cube031_1.geometry}
        material={gltf.materials.wall}
      />
    </T.Group>
    <T.Mesh
      geometry={gltf.nodes.mania.geometry}
      material={gltf.materials["Material.005"]}
      position={[-30, 1.5, 21]}
      scale={3.27}
    />
  {:catch error}
    <slot name="error" {error} />
  {/await}

  <slot {ref} />
</T>
