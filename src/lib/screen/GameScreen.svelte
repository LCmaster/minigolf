<script>
  import { createEventDispatcher } from "svelte";
  import { useGame } from "../useGame";
  import MenuScreen from "./MenuScreen.svelte";
  import ScoreCard from "./ScoreCard.svelte";
  import TwitterShareButton from "./TwitterShareButton.svelte";
  import StrokeCounterIndicator from "./StrokeCounterIndicator.svelte";
  import HoleIndicator from "./HoleIndicator.svelte";

  export let hits;
  export let completed;

  const game = useGame();

  const dispatch = createEventDispatcher();
</script>

{#if $game}
  <div class="fixed top-4 left-4">
    <HoleIndicator hole={$game.current + 1} />
  </div>
  <div class="fixed top-4 right-4">
    <StrokeCounterIndicator strokes={hits} />
  </div>
  {#if completed}
    <div class="fixed top-0 left-0 w-screen h-screen p-8">
      <div class="h-full flex flex-col justify-center items-center">
        <div class="p-6 flex flex-col gap-4 rounded-xl bg-white">
          <h2 class="font-bold text-6xl">Nice Job!</h2>
          <ScoreCard />
          {#if $game.current < $game.stages.length - 1}
            <button
              on:click={() => dispatch("loadNextStage")}
              class="py-2 px-4 rounded-md bg-blue-500 text-white font-semibold"
              >Next</button
            >
          {:else}
            <!-- <h3 class="font-semibold text-lg">Share your score on</h3>
            <TwitterShareButton
              text="A Twitter share button with progressive enhancement"
              url="https://minigolfmania.vercel.app/"
              via="minigolfmania"
            /> -->
            <button
              on:click={() => ($game = null)}
              class="py-2 px-4 rounded-md bg-blue-500 text-white font-semibold"
              >Back to menu</button
            >
          {/if}
        </div>
      </div>
    </div>
  {/if}
{:else}
  <MenuScreen on:startGame />
{/if}
