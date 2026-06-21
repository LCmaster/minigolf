<script>
  export let currentHole;
  export let totalHoleNumber;
  $: display = currentHole + "/" + totalHoleNumber;
</script>

<div class="flex items-center bg-surface-900/60 backdrop-blur-md rounded-full border border-white/10 shadow-lg p-1 pr-4 gap-3">
  <div class="w-10 h-10 flex justify-center items-center rounded-full bg-gradient-to-br from-success-400 to-success-600 shadow-inner">
    <img src="/icons/hole.svg" alt="Hole" class="w-6 h-6" />
  </div>
  <div class="font-mono font-bold text-lg text-white drop-shadow-md">
    {display}
  </div>
</div>
