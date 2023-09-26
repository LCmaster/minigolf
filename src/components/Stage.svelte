<script lang="ts">
  import { BoxGeometry, Group, Material, Mesh, MeshBasicMaterial } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import {
    AutoColliders,
    Collider,
    CollisionGroups,
    RigidBody,
  } from "@threlte/rapier";
  import { createEventDispatcher } from "svelte";

  export let name: string;

  // === GRAPHICAL PROPERTIES === //
  export let courseMaterial: Material;
  export let groundMaterial: Material;

  // === PHYSICAL PROPERTIES === //
  export let friction: number = 0.75;
  export let restitution: number = 0.75;

  const component = forwardEventHandlers();
  export const ref = new Group();

  export let spawn: Array<number>;
  let target: Array<number>;

  const dispatch = createEventDispatcher();
  $: gltf = useGltf(name);

  $: if ($gltf) {
    dispatch("loaded");
    spawn = [...$gltf.nodes.Start.position];
    target = [...$gltf.nodes.Target.position];
  }
</script>

<T is={ref} {...$$restProps} bind:this={$component}>
  {#if $gltf}
    <T.Group>
      <RigidBody type="fixed">
        <AutoColliders shape={"trimesh"} {friction} {restitution}>
          <T.Mesh
            geometry={$gltf.nodes.Course.geometry}
            material={courseMaterial ?? $gltf.nodes.Course.material}
          />
        </AutoColliders>

        <AutoColliders shape={"cuboid"}>
          <T.Mesh
            geometry={$gltf.nodes.Ground.geometry}
            material={groundMaterial ?? $gltf.nodes.Ground.material}
          />
        </AutoColliders>

        <CollisionGroups groups={[1]}>
          <AutoColliders
            sensor
            shape={"cuboid"}
            on:sensorenter={() => dispatch("completed")}
          >
            <T.Mesh position={target}>
              <T.BoxGeometry args={[2.5, 0.01, 2.5]} />
              <T.MeshBasicMaterial transparent opacity={0.0} />
            </T.Mesh>
          </AutoColliders>
        </CollisionGroups>
      </RigidBody>
    </T.Group>
  {/if}
</T>
