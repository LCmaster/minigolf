<script lang="ts">
  import { Group, Material } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import { RigidBody, AutoColliders } from "@threlte/rapier";

  export let name: string;

  // === GRAPHICAL PROPERTIES === //
  export let courseMaterial: Material;
  export let groundMaterial: Material;

  // === PHYSICAL PROPERTIES === //
  export let friction: number = 0.75;
  export let restitution: number = 0.25;

  const component = forwardEventHandlers();
  export const ref = new Group();
</script>

<T is={ref} {...$$restProps} bind:this={$component}>
  {#await useGltf(name)}
    <slot name="fallback" />
  {:then gltf}
    <T.Group>
      <RigidBody type="fixed">
        <AutoColliders shape={"trimesh"} {friction} {restitution}>
          <T.Mesh
            geometry={gltf.nodes.Course.geometry}
            material={courseMaterial ?? gltf.nodes.Course.material}
          />
        </AutoColliders>

        <AutoColliders shape={"cuboid"}>
          <T.Mesh
            geometry={gltf.nodes.Ground.geometry}
            material={groundMaterial ?? gltf.nodes.Ground.material}
          />
        </AutoColliders>
      </RigidBody>
    </T.Group>
  {:catch error}
    <slot name="error" {error} />
  {/await}

  <slot {ref} />
</T>
