<script>
  import { page } from "$app/stores";

  import { T } from "@threlte/core";
  import GameScene from "./scene/GameScene.svelte";
  import Indicators from "./ui/Indicators.svelte";
  import Header from "./ui/Header.svelte";
  import ScoreboardModal from "./modal/ScoreboardModal.svelte";
  import Scene from "$lib/component/Scene.svelte";
  import StageCompleteModal from "./modal/StageCompleteModal.svelte";
  import { useGame } from "../context";

  const { course, current, shots } = useGame();
  const debug = $page.url.searchParams.has("debug");

  let modal = "";
</script>

<Scene {debug}>
  <T.AmbientLight color="#ffffff" intensity={1} />
  <GameScene
    course={$course}
    current={$current}
    on:completed={() => {
      modal = "completed";
    }}
    on:hit={() => {
      $shots[$current] += 1;
    }}
  />
  <div class="fixed top-0 left-0" slot="ui">
    <Header on:quit on:stats={() => (modal = "scoreboard")} />
    <Indicators />
    {#if modal === "completed"}
      <StageCompleteModal
        on:quit
        on:next={() => {
          modal = "";
          $current += 1;
        }}
      />
    {:else if modal === "scoreboard"}
      <ScoreboardModal on:close={() => (modal = "")} />
    {/if}
  </div>
</Scene>
