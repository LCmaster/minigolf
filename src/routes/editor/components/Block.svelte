<script>
  import {
    Box3,
    BoxHelper,
    Color,
    Group,
    MeshBasicMaterial,
    Vector3,
  } from "three";
  import { T, forwardEventHandlers, useFrame } from "@threlte/core";
  import { TransformControls, useGltf, useSuspense } from "@threlte/extras";
  import { createEventDispatcher, onDestroy } from "svelte";

  import { useEditor } from "../context";

  const { testing, blocks, blockSelected } = useEditor();

  export let id;
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
  let box;

  const suspend = useSuspense();
  const gltf = suspend(useGltf(`/block/${type}/${variation}.glb`));

  useFrame(() => {
    if (
      ref.position.x !== position[0] ||
      ref.position.y !== position[1] ||
      ref.position.z !== position[2]
    ) {
      const index = $blocks.findIndex((b) => b.id === id);
      $blocks[index] = {
        id,
        type,
        variation,
        position: [...ref.position],
        rotation,
      };
    }
  });

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
      box = new BoxHelper(mainGroup, 0x990000);
    }
  });

  const slotColor = new Color("#FFD700");
  const slotHoverColor = new Color("#990000");

  const dispatch = createEventDispatcher();
  const component = forwardEventHandlers();

  onDestroy(unsubscribe);
</script>

<T
  is={ref}
  {...$$restProps}
  bind:this={$component}
  {position}
  rotation={[0, -Math.PI * rotation, 0]}
>
  {#if !$testing && $blockSelected === id}
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
            e.stopPropagation();
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
    {#if box}
      <T is={box} />
    {/if}
    {#if type !== "start"}
      <TransformControls object={ref} translationSnap={0.25} />
    {/if}
  {/if}
  {#if mainGroup}
    <T
      is={mainGroup}
      on:click={(e) => {
        e.stopPropagation();
        $blockSelected = id;
      }}
    />
  {/if}

  <slot {ref} />
</T>
