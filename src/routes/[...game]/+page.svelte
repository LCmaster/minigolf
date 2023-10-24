<script>
  import { Canvas, T } from "@threlte/core";
  import { World } from "@threlte/rapier";
  import Stage from "$lib/scene/Stage.svelte";
  import { setGame } from "./context";
  export let data;

  let { shots, stages, current } = setGame(data.stages);
</script>

<div class="w-screen h-screen">
  <Canvas>
    <World gravity={[0, -15, 0]}>
      <!-- <Debug /> -->
      <T.AmbientLight color="#ffffff" intensity={1} />
      <T.DirectionalLight
        color="#ffffff"
        intensity={2}
        position={[10, 10, 10]}
        castShadow
      />
      {#each stages as stage, i (i)}
        {#if i === $current}
          <Stage
            scene={stage}
            on:completed={() => {
              $current++;
            }}
            on:hit={() => {
              $shots[$current] += 1;
              $shots = $shots;
            }}
          />
        {/if}
      {/each}
    </World>
  </Canvas>
</div>

<div class="fixed top-0 left-0 w-full">
  <div class="px-4 py-3 flex justify-between">
    <h3
      class="w-24 h-24 h3 p-3 flex flex-col justify-center items-center font-extrabold text-xl rounded-md text-white bg-[#90AC5F] border-4 border-solid border-[#E27438]"
    >
      Hole<span class="font-normal text-2xl">01</span>
    </h3>
    <h3
      class="w-24 h-24 h3 p-3 flex flex-col justify-center items-center font-extrabold text-xl rounded-md text-white bg-[#90AC5F] border-4 border-solid border-[#E27438]"
    >
      Shots <span class="font-normal text-2xl">00</span>
    </h3>
  </div>
</div>
