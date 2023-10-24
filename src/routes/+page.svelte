<script>
  import { writable } from "svelte/store";

  import Scene from "../lib/scene/Scene.svelte";
  import GameScreen from "../lib/screen/GameScreen.svelte";
  import { AppBar, AppShell } from "@skeletonlabs/skeleton";

  export let data;

  let game = writable(null);

  // function startGame(type) {
  //   const stages = data.stages;

  //   let current = 0;
  //   let status = "playing";
  //   let scorecard = [];

  //   $game = {
  //     stages,
  //     current,
  //     status,
  //   };
  // }

  let selectedCourse = 0;

  function handleStartGame(ev) {
    console.log(parseInt(selectedCourse));
  }
</script>

<!-- <GameScreen
    {hits}
    {completed}
    on:startGame={(ev) => startGame(ev.detail)}
    on:loadNextStage={() => {
      hits = 0;
      completed = false;
      $game.current++;
    }}
  /> -->
<AppShell>
  <svelte:fragment slot="header">
    <AppBar background={"variant-filled"}>
      <svelte:fragment slot="lead">
        <h2 class="font-bold uppercase">MinigolfMania</h2>
      </svelte:fragment>
    </AppBar>
  </svelte:fragment>
  <form class="absolute ml-4 mt-4" on:submit|preventDefault={handleStartGame}>
    <div class="w-full card px-4 py-2">
      <h4 class="h4">Course</h4>
      <label class="label">
        <select class="select" name="course" bind:value={selectedCourse}>
          {#each data.courses as course, i}
            <option value={i}>{course.name}</option>
          {/each}
        </select>
      </label>
    </div>
    <div class="w-full mt-2 card px-4 py-2">
      <h4 class="h4">Summary</h4>
      <table class="table">
        <tbody>
          <tr>
            <td class="font-bold">Course:</td>
            <td>{data.courses[selectedCourse].name}</td>
          </tr>
          <tr>
            <td class="font-bold">Holes:</td>
            <td>{data.courses[selectedCourse].holes}</td>
          </tr>
          <tr>
            <td class="font-bold">Difficulty:</td>
            <td>{data.courses[selectedCourse].difficulty}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <button class="w-full mt-2 btn text-white uppercase variant-filled-primary"
      >Start</button
    >
  </form>
  <Scene
    on:hit={() => hits++}
    on:completed={() => {
      $game.stages[$game.current].strokes = hits;
      completed = true;
    }}
  />
</AppShell>
