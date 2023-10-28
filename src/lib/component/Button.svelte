<script>
</script>

<button on:click>
  <div class="p-1 rounded-full bg-gradient-to-t from-[#825106] to-[#F8C487]">
    <div class="p-1 rounded-full bg-gradient-to-b from-[#825106] to-[#F8C487]">
      <div
        class="rounded-full bg-[#63B92E] shadow-[inset_0_-4px_2px_0_rgba(0,0,0,0.5)]"
      >
        <div
          class="px-8 py-2 rounded-full bg-checker-pattern shadow-[inset_0_4px_2px_0_rgba(255,255,255,0.5)]"
        >
          <span
            class="font-acme text-white text-xl drop-shadow-[1px_2px_0_rgba(0,0,0,0.75)]"
          >
            <slot />
          </span>
        </div>
      </div>
    </div>
  </div>
</button>
