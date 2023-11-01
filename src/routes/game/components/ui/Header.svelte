<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
</script>

<div class="fixed top-4 left-4">
  <button on:click={() => dispatch("quit")}>
    <img src="/icons/back.svg" alt="Back" />
  </button>
</div>
<div class="fixed top-4 right-4">
  <button on:click={() => dispatch("stats")}>
    <img src="/icons/stats.svg" alt="Stats" />
  </button>
</div>
