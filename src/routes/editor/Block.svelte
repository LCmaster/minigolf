<script>
  import { Box3, Color, Group, MeshBasicMaterial, Vector3 } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf, useSuspense } from "@threlte/extras";
  import { createEventDispatcher, onDestroy } from "svelte";

  import { blocks } from "./store";

  export let type;
  export let variation = 1;

  export let position = [0, 0, 0];
  export let rotation = 0;

  export let wallMaterial;
  export let groundMaterial;
  export let capMaterial = new MeshBasicMaterial({ color: "#7777777" });

  export const ref = new Group();

  let slots = [];
  let mainGroup;
  let box = new Box3();

  const suspend = useSuspense();
  const gltf = suspend(useGltf(`/block/${type}/${variation}.glb`));

  const unsubscribe = gltf.subscribe((model) => {
    if (model) {
      mainGroup = new Group();
      model.nodes.Scene.children.forEach((child) => {
        if (child.isMesh) {
          if (child.name.toLowerCase().startsWith("slot")) {
            slots = [
              ...slots,
              {
                mesh: child,
                available: true,
              },
            ];
          } else {
            const name = child.name.toLowerCase();
            const isWall = name.startsWith("wall");
            const isCap = name.startsWith("cap");
            if (isCap) {
              child.material = capMaterial;
            }
            if (isWall) {
              child.material = wallMaterial;
            } else {
              child.material = groundMaterial;
            }

            mainGroup.add(child.clone());
          }
        }
      });
    }
  });

  const slotColor = new Color("#FFD700");
  const slotHoverColor = new Color("#990000");

  function computeAvaibleSlots() {
    slots = slots.map(({ mesh, available }, i) => {
      available = true;

      const slotPos = [
        position[0] + mesh.position.x,
        position[1] + mesh.position.y,
        position[2] + mesh.position.z,
      ];

      available = !$blocks.some((block) => {
        const blockPos = block.position;
        return (
          blockPos[0] === slotPos[0] &&
          blockPos[1] === slotPos[1] &&
          blockPos[2] === slotPos[2]
        );
      });

      return { mesh, available };
    });
  }

  const dispatch = createEventDispatcher();
  const component = forwardEventHandlers();

  $: if (slots) computeAvaibleSlots();
  $: if ($blocks) computeAvaibleSlots();

  onDestroy(unsubscribe);
</script>

<T
  is={ref}
  {...$$restProps}
  bind:this={$component}
  {position}
  rotation={[0, Math.PI * rotation, 0]}
>
  {#each slots as { mesh, available }, i}
    {#if available}
      <T.Mesh
        geometry={mesh.geometry}
        material={new MeshBasicMaterial({ color: slotColor })}
        position={[...mesh.position]}
        rotation={[...mesh.rotation]}
        scale={[...mesh.scale]}
        on:pointerenter={(e) => (e.object.material.color = slotHoverColor)}
        on:pointerleave={(e) => (e.object.material.color = slotColor)}
        on:click={(e) => {
          const worldPos = new Vector3();
          e.object.getWorldPosition(worldPos);
          dispatch("slotSelected", {
            position: [...worldPos],
            element: i,
          });
        }}
      />
    {/if}
  {/each}

  {#if mainGroup}
    <T is={mainGroup} />
  {/if}

  <slot {ref} />
</T>
