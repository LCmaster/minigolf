<script>
  import { Canvas } from "@threlte/core";
  import { Debug, World } from "@threlte/rapier";

  export let debug = false;
</script>

<Canvas>
  <World gravity={[0, -15, 0]}>
    {#if debug}
      <Debug />
    {/if}
    <slot />
  </World>
</Canvas>

<slot name="ui" />
