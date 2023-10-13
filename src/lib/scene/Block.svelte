<script>
  import { Color, Group, MeshBasicMaterial, Vector3 } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf, useSuspense } from "@threlte/extras";
  import { createEventDispatcher } from "svelte";

  export let type;
  export let variation = 1;

  export let position = [0, 0, 0];
  export let rotation = 0;

  export let wallMaterial;
  export let groundMaterial;

  export let blocks;

  export const ref = new Group();

  const suspend = useSuspense();
  const gltf = suspend(useGltf(`/block/${type}/${variation}.glb`));

  let slots = [];

  const slotColor = new Color("#FFD700");
  const slotHoverColor = new Color("#990000");

  export function useSlot(position) {}

  export function freeSlot(position) {}

  function computeAvaibleSlots() {}

  function occupied(pos) {
    const worldPos = [
      position[0] + pos[0],
      position[1] + pos[1],
      position[2] + pos[2],
    ];
    const test = blocks
      .map((b) => b.position)
      .some(
        (p) =>
          p[0] === worldPos[0] && p[1] === worldPos[1] && p[2] === worldPos[2]
      );
    return test;
  }

  const dispatch = createEventDispatcher();
  const component = forwardEventHandlers();
</script>

<T
  is={ref}
  dispose={false}
  {...$$restProps}
  bind:this={$component}
  {position}
  rotation={[0, Math.PI * rotation, 0]}
>
  {#await gltf}
    <slot name="fallback" />
  {:then gltf}
    {#each Object.keys(gltf.nodes) as name}
      {#if name !== "Scene"}
        {@const isWall = name.toLowerCase().startsWith("wall")}
        {@const isSlot = name.toLowerCase().startsWith("slot")}
        {@const isCap = name.toLowerCase().startsWith("cap")}
        {@const mesh = gltf.nodes[name]}
        {#if isSlot}
          <T.Mesh
            geometry={mesh.geometry}
            material={new MeshBasicMaterial({ color: slotColor })}
            position={[...mesh.position]}
            rotation={[...mesh.rotation]}
            scale={[...mesh.scale]}
            on:pointerenter={(e) => (e.object.material.color = slotHoverColor)}
            on:pointerleave={(e) => (e.object.material.color = slotColor)}
            on:click={(e) => console.log("Slot Selected")}
          />
        {:else}
          <T.Mesh
            geometry={mesh.geometry}
            material={isCap
              ? new MeshBasicMaterial({ color: "#777777" })
              : isWall
              ? wallMaterial
              : groundMaterial}
            position={[...mesh.position]}
            rotation={[...mesh.rotation]}
            scale={[...mesh.scale]}
          />
        {/if}
      {/if}
    {/each}
  {:catch error}
    <slot name="error" {error} />
  {/await}

  <slot {ref} />
</T>
