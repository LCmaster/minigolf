<script>
  import { onMount } from "svelte";
  import { useGame } from "../../context";
  import HoleIndicator from "./HoleIndicator.svelte";
  import ParIndicator from "./ParIndicator.svelte";
  import ShotsIndicator from "./ShotsIndicator.svelte";

  const { course, current, shots: totalShots } = useGame();

  $: par = $course ? $course.holes[$current].par : 0;
  $: shots = $totalShots !== null ? $totalShots[$current] : 0;
  $: currentHole = $current !== null ? $current + 1 : 0;
  $: totalHoleNumber = $course ? $course.holes.length : 0;
</script>

<div class="fixed bottom-4 left-4 flex flex-col gap-2">
  <ParIndicator {par} />
  <HoleIndicator {currentHole} {totalHoleNumber} />
</div>

<div class="fixed bottom-4 right-4">
  <ShotsIndicator {shots} />
</div>
