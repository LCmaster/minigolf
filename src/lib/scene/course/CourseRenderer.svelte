<script>
  import { createEventDispatcher } from "svelte";

  import Bumper      from "$lib/scene/obstacles/Bumper.svelte";
  import BoostPad    from "$lib/scene/obstacles/BoostPad.svelte";
  import RampBlock   from "$lib/scene/blocks/RampBlock.svelte";
  import LoopBlock   from "$lib/scene/blocks/LoopBlock.svelte";
  import WindmillBlock from "$lib/scene/blocks/WindmillBlock.svelte";
  import TreeBlock   from "$lib/scene/blocks/TreeBlock.svelte";
  import RockBlock   from "$lib/scene/blocks/RockBlock.svelte";
  import GrassBlock  from "$lib/scene/blocks/GrassBlock.svelte";
  import PlinkoPegs  from "$lib/scene/obstacles/PlinkoPegs.svelte";
  import IcePatch    from "$lib/scene/obstacles/IcePatch.svelte";
  import SandTrap    from "$lib/scene/obstacles/SandTrap.svelte";
  import WaterHazard from "$lib/scene/obstacles/WaterHazard.svelte";

  /**
   * @type {import('$lib/types/course').CourseBlock[]}
   * The list of blocks/obstacles to render for the current hole.
   */
  export let blocks = [];

  const dispatch = createEventDispatcher();
</script>

<!--
  Renders all obstacles and decorative blocks for a hole.
  Emits surface-effect events upward for Stage.svelte to apply to the player:
    - iceenter / iceexit
    - sandenter / sandexit
    - waterhazard
-->
{#if blocks && blocks.length > 0}
  {#each blocks as block (block.id)}
    {#if block.type === "bumper"}
      <Bumper
        position={block.position}
        rotation={block.rotation}
        scale={block.scale}
        restitution={block.restitution}
      />

    {:else if block.type === "boost"}
      <BoostPad
        position={block.position}
        rotation={block.rotation}
        scale={block.scale}
        boostForce={block.boostForce}
      />

    {:else if block.type === "ramp" || block.type === "slope"}
      <RampBlock
        type={block.type}
        variation={block.variation}
        position={block.position}
        rotation={block.rotation}
        scale={block.scale}
      />

    {:else if block.type === "loop"}
      <LoopBlock position={block.position} rotation={block.rotation} scale={block.scale} />

    {:else if block.type === "windmill"}
      <WindmillBlock position={block.position} rotation={block.rotation} scale={block.scale} />

    {:else if block.type === "tree"}
      <TreeBlock
        position={block.position}
        rotation={block.rotation}
        scale={block.scale}
        variation={block.variation}
      />

    {:else if block.type === "rock"}
      <RockBlock
        position={block.position}
        rotation={block.rotation}
        scale={block.scale}
        variation={block.variation}
      />

    {:else if block.type === "grass"}
      <GrassBlock
        position={block.position}
        rotation={block.rotation}
        scale={block.scale}
        variation={block.variation}
      />

    {:else if block.type === "plinko"}
      <PlinkoPegs position={block.position} rotation={block.rotation} scale={block.scale} />

    {:else if block.type === "ice"}
      <IcePatch
        position={block.position}
        rotation={block.rotation}
        scale={block.scale}
        on:iceenter={() => dispatch("iceenter")}
        on:iceexit={() => dispatch("iceexit")}
      />

    {:else if block.type === "sand"}
      <SandTrap
        position={block.position}
        rotation={block.rotation}
        scale={block.scale}
        on:sandenter={() => dispatch("sandenter")}
        on:sandexit={() => dispatch("sandexit")}
      />

    {:else if block.type === "water"}
      <WaterHazard
        position={block.position}
        rotation={block.rotation}
        scale={block.scale}
        on:waterhazard={(e) => dispatch("waterhazard", e.detail)}
      />
    {/if}
  {/each}
{/if}
