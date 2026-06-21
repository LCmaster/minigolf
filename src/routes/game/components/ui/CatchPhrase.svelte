<script>
  export let shots;
  export let par;

  let phrase = "Well done";

  $: {
    const diff = shots - par;
    if (shots === 1) {
      phrase = "Hole in one";
    } else if (diff <= -4) {
      phrase = "Condor";
    } else if (diff === -3) {
      phrase = "Albatross";
    } else if (diff === -2) {
      phrase = "Eagle";
    } else if (diff === -1) {
      phrase = "Birdie";
    } else if (diff === 0) {
      phrase = "Par";
    } else if (diff === 1) {
      phrase = "Bogey";
    } else if (diff === 2) {
      phrase = "Double Bogey";
    } else if (diff === 3) {
      phrase = "Triple Bogey";
    } else if (diff >= 4) {
      phrase = "Quadruple Bogey";
    } else {
      phrase = "Well done";
    }
  }
</script>

<p class="text-4xl text-center drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">
  {phrase}!
</p>
