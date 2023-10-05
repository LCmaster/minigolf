<script>
  import { Group, MeshBasicMaterial } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import { AutoColliders, CollisionGroups, RigidBody } from "@threlte/rapier";

  export let number;
  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];

  export let wallFriction;
  export let wallRestitution;
  export let groundFriction;
  export let groundRestitution;

  export const ref = new Group();

  const gltf = useGltf(`/block/end/${number}.glb`);
  const component = forwardEventHandlers();
</script>

<T
  is={ref}
  dispose={false}
  {...$$restProps}
  bind:this={$component}
  {position}
  {rotation}
>
  {#await gltf}
    <slot name="fallback" />
  {:then gltf}
    {#each Object.keys(gltf.nodes) as name}
      {#if name !== "Scene"}
        {@const nameChunk = name.split("_")}
        {@const isSensor = nameChunk[1] === "1"}
        {@const isHole = nameChunk[2].startsWith("hole")}
        {@const isWall = nameChunk[2].startsWith("wall")}
        {@const mesh = gltf.nodes[name]}
        <RigidBody type={"fixed"}>
          <AutoColliders
            shape={nameChunk[0]}
            sensor={isSensor}
            friction={isWall ? wallFriction : groundFriction}
            restitution={isWall ? wallRestitution : groundRestitution}
          >
            <T.Mesh
              geometry={mesh.geometry}
              material={isHole
                ? new MeshBasicMaterial({ transparent: true, opacity: 0.0 })
                : mesh.material}
              position={[...mesh.position]}
              rotation={[...mesh.rotation]}
              scale={[...mesh.scale]}
            />
          </AutoColliders>
        </RigidBody>
      {/if}
    {/each}
  {:catch error}
    <slot name="error" {error} />
  {/await}

  <slot {ref} />
</T>
