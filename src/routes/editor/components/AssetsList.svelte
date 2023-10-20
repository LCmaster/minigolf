<script lang="ts">
  import { TabGroup, Tab } from "@skeletonlabs/skeleton";
  import { createEventDispatcher } from "svelte";

  export let types: Array<string>;
  export let blocks: Array<{ type: string; variation: number }>;

  export let selected = { type: "extension", variation: 1 };

  let tabSet: number = 0;

  const dispatch = createEventDispatcher();
</script>

<TabGroup
  justify="justify-center"
  active="variant-filled-primary font-bold text-white"
  hover="hover:variant-soft-primary"
  flex="flex-1 lg:flex-none"
  rounded=""
  border=""
  class="bg-surface-100-800-token w-full"
>
  <Tab bind:group={tabSet} name="tab1" value={0}>
    <svelte:fragment slot="lead">
      <div class="flex justify-center items-center">
        <img src="/editor/bricks.svg" alt="" width="48" height="48" />
      </div>
    </svelte:fragment>
    <span class=" ">Blocks</span>
  </Tab>
  <Tab bind:group={tabSet} name="tab2" value={1}>
    <svelte:fragment slot="lead">
      <div class="flex justify-center items-center">
        <img src="/editor/props.svg" alt="" width="48" height="48" />
      </div>
    </svelte:fragment>
    <span class=" ">Props</span>
  </Tab>
  <Tab bind:group={tabSet} name="tab3" value={2}>
    <svelte:fragment slot="lead">
      <div class="flex justify-center items-center">
        <img src="/editor/terrain.svg" alt="" width="48" height="48" />
      </div>
    </svelte:fragment>
    <span class=" ">Terrain</span>
  </Tab>
  <!-- Tab Panels --->
  <svelte:fragment slot="panel">
    {#if tabSet === 0}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        {#each types as type}
          {#each blocks.filter((b) => b.type === type) as block, i}
            <button
              class="btn flex flex-col"
              class:variant-filled-primary={selected.type === block.type &&
                selected.variation === block.variation}
              on:click={() => dispatch("assetSelected", block)}
            >
              <span>
                <img
                  src={`/block/${type}/${i + 1}.png`}
                  alt="Extension"
                  width="64"
                  height="64"
                />
              </span>
              <span class="flex-auto capitalize"
                >{block.type} {block.variation}</span
              >
            </button>
          {/each}
        {/each}
      </div>
    {:else if tabSet === 1}
      (tab panel 2 contents)
    {:else if tabSet === 2}
      (tab panel 3 contents)
    {/if}
  </svelte:fragment>
</TabGroup>
