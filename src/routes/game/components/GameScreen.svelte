<script>
  import { page } from "$app/stores";
  import { onMount, onDestroy } from "svelte";
  import { bgm } from "$lib/stores/audio";

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

  onMount(() => {
    if ($course?.theme === "clear" || !$course?.theme) {
      bgm.play("/sounds/clear_theme.mp3");
    }
  });

  onDestroy(() => {
    bgm.stop();
  });
</script>

<Scene {debug}>
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
