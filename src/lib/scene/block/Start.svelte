<script>
  import { Group } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import { RigidBody, AutoColliders } from "@threlte/rapier";

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];

  export let wallFriction = 0.5;
  export let wallRestitution = 0.9;
  export let groundFriction = 0.75;
  export let groundRestitution = 0.5;

  export const ref = new Group();

  const gltf = useGltf("/block/start.glb");

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
        {@const isWall = nameChunk[1].toLowerCase().startsWith("wall")}
        {@const mesh = gltf.nodes[name]}
        <RigidBody type={"fixed"}>
          <AutoColliders
            shape={nameChunk[0]}
            friction={isWall ? wallFriction : groundFriction}
            restitution={isWall ? wallRestitution : groundRestitution}
          >
            <T.Mesh
              geometry={mesh.geometry}
              material={mesh.material}
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
