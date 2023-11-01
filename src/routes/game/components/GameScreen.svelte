<script>
  import { page } from "$app/stores";

  import CurrentHoleIndicator from "./CurrentHoleIndicator.svelte";
  import Leaderboards from "./Leaderboards.svelte";
  import ShotsIndicator from "./ShotsIndicator.svelte";
  import { Canvas, T } from "@threlte/core";
  import { Debug, World } from "@threlte/rapier";
  import GameScene from "./GameScene.svelte";
  import { createEventDispatcher } from "svelte";
  import HoleIndicator from "./HoleIndicator.svelte";
  import ParIndicator from "./ParIndicator.svelte";
  import Indicators from "./Indicators.svelte";
  import Header from "./Header.svelte";
  import ScoreboardModal from "./ScoreboardModal.svelte";

  export let game;

  const isDebuging = $page.url.searchParams.has("debug");

  let showScoreboard = false;

  let complete = false;
  let shots = game.course.holes.map((_) => 0);
  $: hole = game.current + 1;

  const dispatch = createEventDispatcher();
</script>

<Canvas>
  <World gravity={[0, -15, 0]}>
    {#if isDebuging}
      <Debug />
    {/if}
    <T.AmbientLight color="#ffffff" intensity={1} />
    <GameScene
      {game}
      on:completed={() => (complete = true)}
      on:hit={() => {
        shots[game.current] += 1;
        shots = shots;
      }}
    />
  </World>
</Canvas>

<Header on:quit on:stats={() => (showScoreboard = true)} />
<Indicators
  par={game.course.holes[game.current].par}
  currentHole={hole}
  totalHoleNumber={game.course.holes.length}
  shots={shots[game.current]}
/>
{#if complete}
  <div class="fixed top-0 left-0 w-screen h-screen bg-black/25">
    <div
      class="variant-filled absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-md"
    >
      <h2
        class="h2 text-lg px-6 py-2 absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2 font-acme rounded-full bg-[#7ACF46] bg-[url('/checker_pattern_2x2.png')] border-4 border-solid border-[#DEC6A3]"
      >
        <span class="drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">Scoreboard</span
        >
      </h2>
      <div
        class="px-8 py-4 pt-10 font-acme flex flex-col justify-between gap-4"
      >
        <p
          class="text-4xl text-center drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]"
        >
          {#if shots[game.current] === 1}
            Hole in one!
          {:else if shots[game.current] === game.course.holes[game.current].par}
            Par!
          {:else if shots[game.current] === game.course.holes[game.current].par + 1}
            Boguey!
          {:else}
            Well done!
          {/if}
        </p>

        <Leaderboards
          current={game.current}
          holes={game.course.holes.map((_, index) => index + 1)}
          pars={game.course.holes.map(({ par }) => par)}
          {shots}
        />
        <div
          class="flex justify-center"
          class:justify-between={game.current < game.course.holes.length - 1}
        >
          <button
            class="flex flex-col justify-center items-center"
            on:click={() => {
              dispatch("quit");
            }}
          >
            <img src="/icons/home.svg" alt="Home" />
            <span>Back</span>
          </button>
          <!-- <button
            class="flex flex-col justify-center items-center"
            on:click={() => {
              dispatch("replay");
            }}
          >
            <img src="/icons/replay.svg" alt="Replay" />
            <span>Replay</span>
          </button> -->
          {#if game.current < game.course.holes.length - 1}
            <button
              class="flex flex-col justify-center items-center"
              on:click={() => {
                game.current += 1;
                complete = false;
              }}
            >
              <img src="/icons/next.svg" alt="Next" />
              <span>Next</span>
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else if showScoreboard}
  <ScoreboardModal {game} {shots} on:close={() => (showScoreboard = false)} />
{/if}
