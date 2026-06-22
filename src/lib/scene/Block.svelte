<script>
  import { Color, Group, MeshBasicMaterial, MeshStandardMaterial, Vector3, Shape } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import { AutoColliders } from "@threlte/rapier";
  import { createEventDispatcher } from "svelte";

  export let type;
  export let variation = 1;

  export let position = [0, 0, 0];
  export let rotation = [0, 0, 0];
  export let scale = [1, 1, 1];

  export let wallMaterial = new MeshStandardMaterial({ color: "#8B5A2B" });
  export let groundMaterial = new MeshStandardMaterial({ color: "#567D46" });

  export let blocks = [];

  $: actualRotation = Array.isArray(rotation) ? rotation : [0, Math.PI * rotation, 0];

  export const ref = new Group();

  $: gltfPromise = useGltf(`/block/${type}/${variation}.glb`);

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
  rotation={actualRotation}
  {scale}
>
    {#await gltfPromise}
      <slot name="fallback" />
    {:then gltf}
      {#if gltf}
        <AutoColliders shape="convexHull">
          {#each Object.keys(gltf.nodes) as name}
            {#if name !== "Scene"}
              {@const isWall = name.toLowerCase().startsWith("wall")}
              {@const isSlot = name.toLowerCase().startsWith("slot")}
              {@const isCap = name.toLowerCase().startsWith("cap")}
              {@const mesh = gltf.nodes[name]}
              {#if mesh.isMesh}
                {#if isSlot}
                  <T.Mesh
                    geometry={mesh.geometry}
                    material={new MeshBasicMaterial({ color: slotColor })}
                    position={mesh.position.toArray()}
                    rotation={mesh.rotation.toArray()}
                    scale={mesh.scale.toArray()}
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
                    position={mesh.position.toArray()}
                    rotation={mesh.rotation.toArray()}
                    scale={mesh.scale.toArray()}
                    castShadow
                    receiveShadow
                  />
                {/if}
              {/if}
            {/if}
          {/each}
        </AutoColliders>
      {/if}
    {:catch error}
      <T.Mesh position={[0, 1, 0]}>
        <T.BoxGeometry args={[2, 2, 2]} />
        <T.MeshStandardMaterial color="#ef4444" wireframe />
      </T.Mesh>
    {/await}

  <slot {ref} />
</T>
