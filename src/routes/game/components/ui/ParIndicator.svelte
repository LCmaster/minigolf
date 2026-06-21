<script>
  export let par = 0;
  $: display = par < 10 ? "0" + par : par;
</script>

<div class="flex items-center bg-surface-900/60 backdrop-blur-md rounded-full border border-white/10 shadow-lg p-1 pr-3 gap-2">
  <div class="w-8 h-8 flex flex-col justify-center items-center gap-[3px] rounded-full bg-gradient-to-br from-tertiary-400 to-tertiary-600 shadow-inner">
    <div class="w-3 h-[3px] rounded-full bg-white shadow-sm" />
    <div class="w-3 h-[3px] rounded-full bg-white shadow-sm" />
  </div>
  <div class="font-mono font-bold text-sm text-white drop-shadow-md">
    PAR {display}
  </div>
</div>
