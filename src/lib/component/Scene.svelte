<script>
  import { Canvas } from "@threlte/core";
  import { Debug, World } from "@threlte/rapier";

  export let debug = false;
</script>

<Canvas>
  <World>
    {#if debug}
      <Debug />
    {/if}
    <slot />
  </World>
</Canvas>

<slot name="ui" />
