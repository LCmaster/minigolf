<script>
  export let shots;
  export let par;

  let phrase = "Well done";

  if (shots === 1) {
    phrase = "Hole in one";
  } else if (par > 2 && shots === par - 1) {
    phrase = "Birdie";
  } else if (shots === par) {
    phrase = "Par";
  } else if (shots === par + 1) {
    phrase = "Bogey";
  }
</script>

<p class="text-4xl text-center drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)]">
  {phrase}!
</p>
