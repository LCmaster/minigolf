<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
</script>

<div class="w-screen fixed top-0 left-0">
  <div class="container mx-auto">
    <img class="block mx-auto" src="/logo.png" alt="Mini Golf Mania" />
    <div class="flex flex-col gap-4">
      <button
        class="py-2 px-4 rounded-md bg-blue-500 text-white font-semibold"
        on:click={() => dispatch("startGame", "quick")}>Play</button
      >
    </div>
  </div>
</div>
