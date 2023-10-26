<script>
  import { writable } from "svelte/store";
  import CurrentHoleIndicator from "./CurrentHoleIndicator.svelte";
  import Leaderboards from "./Leaderboards.svelte";
  import StrokesIndicator from "./StrokesIndicator.svelte";
  import { Canvas, T } from "@threlte/core";
  import { World } from "@threlte/rapier";
  import GameScene from "./GameScene.svelte";
  import { createEventDispatcher } from "svelte";

  export let game;
  let complete = false;
  let strokes = game.course.holes.map((_) => 0);
  $: hole = game.current + 1;

  const dispatch = createEventDispatcher();
</script>

<Canvas>
  <World gravity={[0, -15, 0]}>
    <T.AmbientLight color="#ffffff" intensity={1} />
    <GameScene
      {game}
      on:completed={() => (complete = true)}
      on:hit={() => {
        strokes[game.current] += 1;
        strokes = strokes;
      }}
    />
  </World>
</Canvas>

<div class="absolute bottom-4 left-4">
  <CurrentHoleIndicator {hole} />
</div>

<div class="absolute bottom-4 right-4">
  <StrokesIndicator strokes={strokes[game.current]} />
</div>

{#if complete}
  <div class="fixed top-0 left-0 w-screen h-screen bg-black/25">
    <div
      class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 flex flex-col justify-between gap-4 card rounded-md"
    >
      <h2 class="h2 text-center">Yaayyy!</h2>
      <Leaderboards
        current={game.current}
        holes={game.course.holes.map((_, index) => index + 1)}
        pars={game.course.holes.map(({ par }) => par)}
        {strokes}
      />
      <div class="px-8 py-4 flex justify-center gap-8">
        <button
          class="btn-icon"
          on:click={() => {
            dispatch("quit");
          }}
        >
          <span><img src="/icons/home.svg" alt="Home" />Menu</span>
        </button>
        {#if game.current < game.course.holes.length - 1}
          <button
            class="btn-icon"
            on:click={() => {
              game.current += 1;
              complete = false;
            }}
          >
            <span><img src="/icons/next.svg" alt="Next" />Next</span>
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
