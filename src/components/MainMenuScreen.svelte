<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
</script>

<div class="w-screen fixed top-0 left-0">
  <div class="container mx-auto">
    <h2 class="mb-16 font-bold text-2xl md:text-4xl text-center text-white">
      Mini Golf Mania
    </h2>
    <div class="flex flex-col gap-4">
      <button
        class="py-2 px-4 rounded-md bg-blue-500 text-white"
        on:click={() => dispatch("startGame", "quick")}
        >Quick Game (09 holes)</button
      >
    </div>
  </div>
</div>
