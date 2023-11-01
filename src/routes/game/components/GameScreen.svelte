<script>
  import { page } from "$app/stores";

  import { T } from "@threlte/core";
  import GameScene from "./scene/GameScene.svelte";
  import Indicators from "./ui/Indicators.svelte";
  import Header from "./ui/Header.svelte";
  import ScoreboardModal from "./modal/ScoreboardModal.svelte";
  import Scene from "$lib/component/Scene.svelte";
  import StageCompleteModal from "./modal/StageCompleteModal.svelte";

  export let game;

  const debug = $page.url.searchParams.has("debug");

  let modal = "";
  let shots = game.course.holes.map((_) => 0);
  $: hole = game.current + 1;
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
