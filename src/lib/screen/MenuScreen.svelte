<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
</script>

<div class="h-screen w-screen fixed top-0 left-0">
  <div class="h-full container mx-auto">
    <div class="h-full flex flex-col justify-center gap-4">
      <button
        class="py-2 px-4 rounded-md bg-blue-500 text-white font-semibold"
        on:click={() => dispatch("startGame", "quick")}>Play</button
      >
    </div>
  </div>
</div>
