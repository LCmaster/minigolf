<script>
  import { createEventDispatcher } from "svelte";
  import { Canvas, T } from "@threlte/core";
  import { World } from "@threlte/rapier";
  import LobbyScene from "./LobbyScene.svelte";
  import HomeScene from "./HomeScene.svelte";

  const dispatch = createEventDispatcher();

  export let courses;
  let selectedCourse = 0;

  function handleSubmit(ev) {
    dispatch("submit", courses[selectedCourse]);
  }
</script>

<Canvas>
  <World gravity={[0, -15, 0]}>
    <T.PerspectiveCamera
      makeDefault
      fov={60}
      position={[0, 75, 75]}
      on:create={({ ref }) => {
        ref.lookAt(0, 0, 35);
      }}
    />
    <T.AmbientLight color="#ffffff" intensity={2} />
    <T.DirectionalLight
      color="#ffffff"
      intensity={1}
      position={[0, 2.5, 4]}
      castShadow
    />
    <HomeScene />
  </World>
</Canvas>

<!-- <div class="fixed top-16 left-4">
  <form on:submit|preventDefault={handleSubmit}>
    <div class="w-full card px-4 py-2">
      <h4 class="h4">Course</h4>
      <label class="label">
        <select class="select" name="course" bind:value={selectedCourse}>
          {#each courses as course, i}
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
            <td>{courses[selectedCourse].name}</td>
          </tr>
          <tr>
            <td class="font-bold">Holes:</td>
            <td>{courses[selectedCourse].holes.length}</td>
          </tr>
          <tr>
            <td class="font-bold">Difficulty:</td>
            <td>{courses[selectedCourse].difficulty}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <button class="w-full mt-2 btn text-white uppercase variant-filled-primary"
      >Start</button
    >
  </form>
</div> -->
