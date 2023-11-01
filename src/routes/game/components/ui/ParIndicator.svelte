<script>
  export let par = 0;
  $: display = par < 10 ? "0" + par : par;
</script>

<div class="flex items-center gap-[0px]">
  <div
    class="z-10 w-9 h-9 flex flex-col justify-center items-center gap-1 rounded-lg bg-gradient-to-b from-[#9FF20D] to-[#4C9900] shadow-[inset_0_-2px_0_rgba(0,0,0,0.5)]"
  >
    <div
      class="w-4 h-1 rounded-full bg-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]"
    />
    <div
      class="w-4 h-1 rounded-full bg-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]"
    />
    <!-- <img src="/icons/par.svg" alt="Par" /> -->
  </div>
  <div
    class="z-0 -ml-[2px] px-2 py-1 font-mono font-bold text-sm text-white rounded-lg rounded-l-none bg-[#4A4A4A] drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]"
  >
    {display}
  </div>
</div>
