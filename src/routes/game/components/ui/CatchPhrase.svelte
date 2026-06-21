<script>
  import { scale } from "svelte/transition";
  import { backOut } from "svelte/easing";

  export let shots;
  export let par;

  let phraseObj = { text: "Well done", classes: "text-white" };

  $: {
    const diff = shots - par;
    if (shots === 1) {
      phraseObj = { text: "Hole in one", classes: "bg-gradient-to-br from-yellow-300 to-yellow-600 text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse" };
    } else if (diff <= -4) {
      phraseObj = { text: "Condor", classes: "bg-gradient-to-br from-yellow-300 to-yellow-600 text-transparent bg-clip-text drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse" };
    } else if (diff === -3) {
      phraseObj = { text: "Albatross", classes: "bg-gradient-to-br from-yellow-200 to-yellow-500 text-transparent bg-clip-text drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" };
    } else if (diff === -2) {
      phraseObj = { text: "Eagle", classes: "bg-gradient-to-br from-tertiary-300 to-tertiary-500 text-transparent bg-clip-text" };
    } else if (diff === -1) {
      phraseObj = { text: "Birdie", classes: "bg-gradient-to-br from-success-300 to-success-500 text-transparent bg-clip-text" };
    } else if (diff === 0) {
      phraseObj = { text: "Par", classes: "text-success-400 drop-shadow-md" };
    } else if (diff === 1) {
      phraseObj = { text: "Bogey", classes: "text-warning-500 drop-shadow-md" };
    } else if (diff === 2) {
      phraseObj = { text: "Double Bogey", classes: "text-error-400 drop-shadow-md" };
    } else if (diff === 3) {
      phraseObj = { text: "Triple Bogey", classes: "text-error-500 drop-shadow-md" };
    } else if (diff >= 4) {
      phraseObj = { text: "Quadruple Bogey", classes: "bg-gradient-to-br from-error-500 to-error-700 text-transparent bg-clip-text drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" };
    } else {
      phraseObj = { text: "Well done", classes: "text-white drop-shadow-md" };
    }
  }
</script>

<div class="h-16 flex justify-center items-center overflow-visible my-4">
  {#key phraseObj.text}
    <p 
      in:scale={{ duration: 600, start: 0.2, easing: backOut }} 
      class="text-5xl md:text-6xl text-center font-black italic tracking-wider {phraseObj.classes}"
    >
      {phraseObj.text}!
    </p>
  {/key}
</div>
