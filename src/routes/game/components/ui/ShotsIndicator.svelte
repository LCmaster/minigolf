<script>
  export let shots = 0;
  $: display = shots < 10 ? "0" + shots : shots;
</script>

<div class="flex items-center gap-[0px]">
  <div
    class="z-0 p-2 font-mono font-bold text-white rounded-lg rounded-r-none bg-[#4A4A4A] drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]"
  >
    {display}
  </div>
  <div
    class="z-10 -ml-[2px] w-12 h-12 flex justify-center items-center rounded-lg bg-gradient-to-b from-[#F6A655] to-[#E57300] shadow-[inset_0_-2px_0_rgba(0,0,0,0.5)]"
  >
    <img src="/icons/golf_ball.svg" alt="Ball" />
  </div>
</div>
