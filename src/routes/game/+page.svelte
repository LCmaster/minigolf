<script>
  import ArrowButton from "$lib/component/ArrowButton.svelte";
  import Button from "$lib/component/Button.svelte";
  import GameScreen from "./components/GameScreen.svelte";

  export let data;
  let current = 0;
  let game = null;

  function handleGameStart() {
    const course = data.courses[current];
    game = {
      current: 0,
      course,
    };
  }
</script>

<div class="w-screen h-screen flex justify-center items-center bg-[#C4E9CC]">
  {#if game}
    <GameScreen bind:game on:quit={() => (game = null)} />
  {:else}
    <div class="flex flex-col gap-4">
      <div
        class="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_1fr] gap-x-2 gap-y-4"
      >
        <div class="flex justify-center items-center">
          <Button
            on:click={() => (current = current === 0 ? 0 : current - 1)}
            class="w-12 h-12"
          >
            <img src="/icons/arrow_left.svg" alt="Prev" />
          </Button>
        </div>

        {#each data.courses as course, i (i)}
          {#if i === current}
            <div
              class="px-4 py-4 flex flex-col gap-4 rounded-md text-white variant-filled"
            >
              <h2
                class="h2 font-acme text-2xl drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]"
              >
                {course.name}
              </h2>
              <div class="bg-zinc-400 w-40 h-36 rounded-md" />

              <ul
                class="list font-roboto font-bold drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]"
              >
                <li>
                  <span>Holes:</span>
                  <span>{course.holes.length}</span>
                </li>
                <li>
                  <span>Total par:</span>
                  <span>
                    {course.holes
                      .map((h) => h.par)
                      .reduce((prev, curr) => prev + curr, 0)}
                  </span>
                </li>
                <li>
                  <span>Difficulty:</span>
                  <span>{course.difficulty}</span>
                </li>
              </ul>
            </div>
          {/if}
        {/each}
        <div class="flex justify-center items-center">
          <Button
            on:click={() =>
              (current = current < data.courses.length - 1 ? current + 1 : 0)}
            class="w-12 h-12"
          >
            <img src="/icons/arrow_right.svg" alt="Next" />
          </Button>
        </div>
        <Button
          class="col-start-2 w-full from-[#F6A655] to-[#E57300]"
          on:click={handleGameStart}>Play</Button
        >
      </div>
    </div>
  {/if}
</div>
