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

  const THEME_MUSIC = {
    clear: "/sounds/clear_theme.mp3",
    sunset: "/sounds/clear_theme.mp3", // Using clear theme for all for the moment
    night: "/sounds/clear_theme.mp3",
    vaporwave: "/sounds/clear_theme.mp3",
  };

  const THEME_VOLUMES = {
    clear: 0.4,
    sunset: 0.15, // Sunset is louder, turn it down
    night: 0.4,
    vaporwave: 0.4,
  };

  onMount(() => {
    const theme = $course?.theme || "clear";
    const bgmSrc = THEME_MUSIC[theme] || THEME_MUSIC["clear"];
    const vol = THEME_VOLUMES[theme] || 0.4;
    bgm.play(bgmSrc, vol);
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
    
    <div class="fixed top-4 left-0 w-full pointer-events-none flex flex-col items-center justify-start z-50">
      <h2 class="text-xl font-black text-[#4A4A4A] drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)] tracking-wide">{$course?.name || "Untitled Level"}</h2>
      <p class="text-sm font-bold text-[#4A4A4A] drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)] opacity-90">By {$course?.author || "Unknown Player"}</p>
    </div>

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
