<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
</script>

<div class="fixed top-0 left-0">
  <header class="w-screen px-4 py-2 bg-slate-950">
    <div class="flex justify-between">
      <h2 class="font-bold text-md uppercase text-white">minigolfmania</h2>
    </div>
  </header>
  <div class="mx-4 my-2 flex flex-col gap-2">
    <div class="py-2 px-4 text-white bg-black/50">
      <h3 class="font-semibold text-md">Select Course</h3>
      <p class="font-thin italic text-xs">Course 1</p>
    </div>
    <div class="py-2 px-4 font-semibold text-sm text-white bg-black/50">
      <h3 class="font-semibold text-md">Select Mode</h3>
      <p class="font-thin italic text-xs">Short</p>
    </div>
    <div class="py-2 px-4 font-semibold text-white bg-black/50">
      <h3 class="font-semibold text-md">Summary</h3>
      <p class="mt-2 font-thin text-sm">
        <strong class="font-bold">Holes:</strong> 09
      </p>
      <p class="font-thin text-sm">
        <strong class="font-bold">Total Par:</strong> 18
      </p>
      <p class="font-thin text-sm">
        <strong class="font-bold">Difficulty:</strong> Easy
      </p>
    </div>
    <button
      class="py-2 px-4 rounded-md bg-blue-500 text-white font-semibold"
      on:click={() => dispatch("startGame", "quick")}
    >
      Play
    </button>
  </div>
</div>
