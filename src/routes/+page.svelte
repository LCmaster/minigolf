<script>
  import { writable } from "svelte/store";

  import Scene from "../lib/scene/Scene.svelte";
  import GameScreen from "../lib/screen/GameScreen.svelte";
  import { setContext } from "svelte";

  let hits = 0;
  let completed = false;

  let game = writable(null);
  setContext("minigolf/game/context", game);

  function startGame(type) {
    const stages = [
      { name: "Stage 1", file: "/Stage_001.glb" },
      { name: "Stage 2", file: "/Stage_002.glb" },
    ];

    let current = 0;
    let status = "playing";

    $game = {
      stages,
      current,
      status,
    };
  }
</script>

<div class="w-screen h-screen">
  <Scene on:hit={() => hits++} on:completed={() => (completed = true)} />
  <GameScreen {hits} {completed} on:startGame={(ev) => startGame(ev.detail)} />
</div>
