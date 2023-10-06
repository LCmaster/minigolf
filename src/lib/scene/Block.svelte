<script>
  import { Group, MeshBasicMaterial } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import { RigidBody, AutoColliders } from "@threlte/rapier";
  import { createEventDispatcher } from "svelte";

  export let type;
  export let variation = 1;

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];

  export let wallFriction = 0.5;
  export let wallRestitution = 0.9;
  export let groundFriction = 0.75;
  export let groundRestitution = 0.5;

  export let wallMaterial;
  export let groundMaterial;

  export const ref = new Group();
  export const isEnd = type === "end";
  export const isStart = type === "start";

  const dispatch = createEventDispatcher();

  const gltf = useGltf(`/block/${type}/${variation}.glb`);

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
    <RigidBody type={"fixed"}>
      {#each Object.keys(gltf.nodes) as name}
        {#if name !== "Scene"}
          {@const nameChunk = name.split("_")}
          {@const isSensor = nameChunk[1] === "1"}
          {@const isWall = nameChunk[2].toLowerCase().startsWith("wall")}
          {@const isHole = nameChunk[2].toLowerCase().startsWith("hole")}
          {@const isTarget = nameChunk[2].toLowerCase().startsWith("target")}
          {@const mesh = gltf.nodes[name]}
          <AutoColliders
            shape={nameChunk[0]}
            sensor={isSensor}
            on:sensorenter={() => {
              if (isTarget) {
                dispatch("completed");
              }
            }}
            friction={isWall ? wallFriction : groundFriction}
            restitution={isWall ? wallRestitution : groundRestitution}
          >
            <T.Mesh
              geometry={mesh.geometry}
              material={isHole
                ? new MeshBasicMaterial({ transparent: true, opacity: 0.0 })
                : isWall
                ? wallMaterial
                : groundMaterial}
              position={[...mesh.position]}
              rotation={[...mesh.rotation]}
              scale={[...mesh.scale]}
            />
          </AutoColliders>
        {/if}
      {/each}
    </RigidBody>
  {:catch error}
    <slot name="error" {error} />
  {/await}

  <slot {ref} />
</T>
