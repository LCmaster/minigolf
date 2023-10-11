<script>
  import { writable } from "svelte/store";

  import Scene from "../lib/scene/Scene.svelte";
  import GameScreen from "../lib/screen/GameScreen.svelte";
  import { setContext } from "svelte";

  export let data;

  let hits = 0;
  let completed = false;

  let game = writable(null);
  setContext("minigolf/game/context", game);

  function startGame(type) {
    const stages = data.stages;

    let current = 0;
    let status = "playing";
    let scorecard = [];

    $game = {
      stages,
      current,
      status,
    };
  }
</script>

<div class="w-screen h-screen">
  <Scene
    on:hit={() => hits++}
    on:completed={() => {
      $game.stages[$game.current].strokes = hits;
      completed = true;
    }}
  />
  <GameScreen
    {hits}
    {completed}
    on:startGame={(ev) => startGame(ev.detail)}
    on:loadNextStage={() => {
      hits = 0;
      completed = false;
      $game.current++;
    }}
  />
</div>
