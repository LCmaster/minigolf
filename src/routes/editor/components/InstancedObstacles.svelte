<script>
  import { InstancedMesh, Instance } from "@threlte/extras";
  import { useEditor } from "../context";

  export let blocks = [];
  export let positionOffset = [0, 0, 0];

  const { blockSelected } = useEditor();

  function selectBlock(id) {
    $blockSelected = id;
  }
</script>

{#if blocks.length > 0}
  <InstancedMesh limit={blocks.length} range={blocks.length} receiveShadow position={positionOffset}>
    <slot />
    {#each blocks as block}
      <Instance
        position={block.position}
        rotation={Array.isArray(block.rotation) ? block.rotation : [0, Math.PI * (block.rotation || 0), 0]}
        scale={block.scale || [1, 1, 1]}
        on:click={(e) => {
          e.stopPropagation();
          selectBlock(block.id);
        }}
      />
    {/each}
  </InstancedMesh>
{/if}
