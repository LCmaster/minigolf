<script>
  import { createEventDispatcher } from "svelte";
  import Leaderboards from "../ui/Leaderboards.svelte";
  import CatchPhrase from "../ui/CatchPhrase.svelte";

  export let game;
  export let shots;

  const dispatch = createEventDispatcher();
</script>

<div class="fixed top-0 left-0 w-screen h-screen bg-black/25">
  <div
    class="variant-filled fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-md"
  >
    <h2
      class="h2 text-lg px-6 py-2 absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2 font-acme rounded-full bg-[#7ACF46] bg-[url('/checker_pattern_2x2.png')] border-4 border-solid border-[#DEC6A3]"
    >
      <span class="drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">Scoreboard</span>
    </h2>
    <div class="px-8 py-4 pt-10 font-acme flex flex-col justify-between gap-4">
      <CatchPhrase {game} {shots} />

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
          on:click={() => dispatch("quit")}
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
            on:click={() => dispatch("next")}
          >
            <img src="/icons/next.svg" alt="Next" />
            <span>Next</span>
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
