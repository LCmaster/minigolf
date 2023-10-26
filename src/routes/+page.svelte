<script>
  import { useGame } from "./context";
  import { writable } from "svelte/store";
  import { Canvas, T } from "@threlte/core";
  import GameScreen from "./components/GameScreen.svelte";
  import { AppBar, AppShell } from "@skeletonlabs/skeleton";
  import GameScene from "./components/GameScene.svelte";
  import LobbyScene from "./components/LobbyScene.svelte";
  import LobbyScreen from "./components/LobbyScreen.svelte";
  import { World } from "@threlte/rapier";

  export let data;

  let game = null;

  function handleGameStart(course) {
    game = {
      current: 0,
      course,
    };
  }
</script>

<AppShell>
  <svelte:fragment slot="header">
    {#if !game}
      <AppBar background={"variant-filled"}>
        <svelte:fragment slot="lead">
          <h2 class="font-bold uppercase">MinigolfMania</h2>
        </svelte:fragment>
      </AppBar>
    {/if}
  </svelte:fragment>

  {#if game}
    <GameScreen bind:game on:quit={() => (game = null)} />
  {:else}
    <LobbyScreen
      courses={data.courses}
      on:submit={(ev) => handleGameStart(ev.detail)}
    />
  {/if}
</AppShell>
