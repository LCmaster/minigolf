<script>
  import { page } from "$app/stores";

  import Leaderboards from "./Leaderboards.svelte";
  import { Canvas, T } from "@threlte/core";
  import GameScene from "./GameScene.svelte";
  import { createEventDispatcher } from "svelte";
  import Indicators from "./Indicators.svelte";
  import Header from "./Header.svelte";
  import ScoreboardModal from "./ScoreboardModal.svelte";
  import Scene from "$lib/component/Scene.svelte";
  import StageCompleteModal from "./StageCompleteModal.svelte";

  export let game;

  const debug = $page.url.searchParams.has("debug");

  let modal = "";
  let showScoreboard = false;

  let complete = false;
  let shots = game.course.holes.map((_) => 0);
  $: hole = game.current + 1;

  const dispatch = createEventDispatcher();
</script>

<Scene {debug}>
  <T.AmbientLight color="#ffffff" intensity={1} />
  <GameScene
    {game}
    on:completed={() => {
      modal = "completed";
    }}
    on:hit={() => {
      shots[game.current] += 1;
      shots = shots;
    }}
  />
  <div class="fixed top-0 left-0" slot="ui">
    <Header on:quit on:stats={() => (modal = "scoreboard")} />
    <Indicators
      par={game.course.holes[game.current].par}
      currentHole={hole}
      totalHoleNumber={game.course.holes.length}
      shots={shots[game.current]}
    />
    {#if modal === "completed"}
      <StageCompleteModal
        {game}
        {shots}
        on:quit
        on:next={() => {
          game.current += 1;
          modal = "";
        }}
      />
    {:else if modal === "scoreboard"}
      <ScoreboardModal {game} {shots} on:close={() => (modal = "")} />
    {/if}
  </div>
</Scene>
