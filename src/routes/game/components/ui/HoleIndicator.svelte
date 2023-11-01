<script>
  export let currentHole;
  export let totalHoleNumber;
  $: display = currentHole + "/" + totalHoleNumber;
</script>

<div class="flex items-center gap-[0px]">
  <div
    class="z-10 w-12 h-12 flex justify-center items-center rounded-lg bg-gradient-to-b from-[#9FF20D] to-[#4C9900] shadow-[inset_0_-2px_0_rgba(0,0,0,0.5)]"
  >
    <img src="/icons/hole.svg" alt="Ball" />
  </div>
  <div
    class="z-0 -ml-[2px] p-2 font-mono font-bold text-white rounded-lg rounded-l-none bg-[#4A4A4A] drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]"
  >
    {display}
  </div>
</div>
