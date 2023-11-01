<script>
  import { createEventDispatcher } from "svelte";
  import Leaderboards from "../ui/Leaderboards.svelte";
  import Button from "$lib/component/Button.svelte";
  import { useGame } from "../../context";

  const { course, current, shots } = useGame();

  let holes = $course.holes.map((_, index) => index + 1);
  let pars = $course.holes.map((hole) => hole.par);

  const dispatch = createEventDispatcher();
</script>

<button
  on:click={() => dispatch("close")}
  class="fixed top-0 left-0 w-screen h-screen bg-black/25"
/>
<div
  class="variant-filled fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-md"
>
  <h2
    class="h2 text-lg px-6 py-2 absolute top-0 left-1/2 -translate-y-1/2 -translate-x-1/2 font-acme rounded-full bg-[#7ACF46] bg-[url('/checker_pattern_2x2.png')] border-4 border-solid border-[#DEC6A3]"
  >
    <span class="drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">Scoreboard</span>
  </h2>
  <div class="px-8 py-4 pt-10 font-acme flex flex-col justify-between gap-4">
    <Leaderboards current={$current} {holes} {pars} shots={$shots} />
    <Button
      class="from-[#F6A655] to-[#E57300]"
      on:click={() => dispatch("close")}>Resume game</Button
    >
  </div>
</div>
