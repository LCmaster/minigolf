<script lang="ts">
  import { TabGroup, Tab, TabAnchor } from "@skeletonlabs/skeleton";

  export let types: Array<string>;
  export let blocks: Array<{ type: string; variation: number }>;

  export let selected = { type: "extension", variation: 1 };
</script>

<div class="px-4 py-2 flex flex-col gap-4">
  {#each types as type}
    <ul class="list">
      <h3 class="h3 uppercase">{type}</h3>
      {#each blocks.filter((b) => b.type === type) as block}
        <li>
          <button
            class="btn"
            class:variant-filled-primary={selected.type === block.type &&
              selected.variation === block.variation}
            on:click={() => (selected = block)}
          >
            <span>
              <img
                src="/editor/blocks.svg"
                alt="Extension"
                width="32"
                height="32"
              />
            </span>
            <span class="flex-auto capitalize"
              >{block.type} {block.variation}</span
            >
          </button>
        </li>
      {/each}
    </ul>
  {/each}
</div>
