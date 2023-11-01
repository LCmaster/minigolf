<script>
  let className = "";
  export { className as class };
</script>

<button
  on:click
  class={"p-[2px] rounded-lg bg-gradient-to-b from-[#9FF20D] to-[#4C9900] shadow-[inset_0_-2px_0_rgba(0,0,0,0.5)] " +
    className}
>
  <div class="px-4 py-2 rounded-lg bg-checker-pattern">
    <span class="font-acme text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.5)]">
      <slot />
    </span>
  </div>
</button>
