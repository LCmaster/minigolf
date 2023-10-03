<script>
  import { createEventDispatcher } from "svelte";
  import { useGame } from "../useGame";
  import MenuScreen from "./MenuScreen.svelte";

  export let hits;
  export let completed;

  const game = useGame();

  const dispatch = createEventDispatcher();
</script>

{#if $game}
  <div class="fixed top-4 right-4">
    <h3>Hits</h3>
    <p>{hits}</p>
  </div>
  {#if completed}
    <div class="fixed top-0 left-0 w-screen h-screen p-8">
      <div class="h-full flex flex-col justify-center items-center">
        <div class="p-6 rounded-xl bg-white/50">
          <h2 class="font-bold text-6xl">Stage Complete</h2>
          <button on:click={() => dispatch("loadNextStage")}>Next</button>
        </div>
      </div>
    </div>
  {/if}
{:else}
  <MenuScreen on:startGame />
{/if}
