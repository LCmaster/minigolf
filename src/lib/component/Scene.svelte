<script>
  import { Canvas } from "@threlte/core";
  import { Debug, World } from "@threlte/rapier";

  export let debug = false;

  function handleKeydown(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "`" || e.key === "F3") {
      e.preventDefault();
      debug = !debug;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<Canvas>
  <World gravity={[0, -15, 0]}>
    {#if debug}
      <Debug />
    {/if}
    <slot />
  </World>
</Canvas>

<slot name="ui" />
