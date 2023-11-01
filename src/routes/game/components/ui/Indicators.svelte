<script>
  import HoleIndicator from "./HoleIndicator.svelte";
  import ParIndicator from "./ParIndicator.svelte";
  import ShotsIndicator from "./ShotsIndicator.svelte";

  export let currentHole;
  export let totalHoleNumber;
  export let par;
  export let shots;
</script>

<div class="fixed bottom-4 left-4 flex flex-col gap-2">
  <ParIndicator {par} />
  <HoleIndicator {currentHole} {totalHoleNumber} />
</div>

<div class="fixed bottom-4 right-4">
  <ShotsIndicator {shots} />
</div>
