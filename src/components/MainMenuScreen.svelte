<script>
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  function startGame(gameType) {
    console.log(gameType);
    dispatch("startGame", gameType);
  }
</script>

<div class="w-screen fixed top-0 left-0">
  <div class="container mx-auto">
    <h2 class="mb-16 font-bold text-2xl md:text-4xl text-center text-white">
      Mini Golf Mania
    </h2>
    <div class="flex flex-col gap-4">
      <button
        class="py-2 px-4 rounded-md bg-blue-500 text-white"
        on:click={() => startGame("quick")}>Quick Game (09 holes)</button
      >
      <button
        class="py-2 px-4 rounded-md bg-blue-500 text-white"
        on:click={() => startGame("long")}>Long Game (18 holes)</button
      >
    </div>
  </div>
</div>
