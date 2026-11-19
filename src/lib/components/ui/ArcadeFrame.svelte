<script>
  import { createEventDispatcher } from "svelte";
  import ArcadeTitle from "./ArcadeTitle.svelte";

  export let title = "";
  export let titleWidthClass = "w-64 md:w-[380px]";
  export let titleViewBoxWidth = 520;
  export let titleFontSize = 54;
  export let maxWidthClass = "max-w-2xl";
  export let paddingClass = "px-5 pt-12 pb-6 md:px-9";
  export let showBackdrop = true;
  export let showDeckStrip = true;
  export let backdropSrc = "/courses/carnival-park-card.png";
  export let showClose = false;
  export let closeLabel = "Close";

  const dispatch = createEventDispatcher();
</script>

<div class="relative w-full {maxWidthClass} rounded-[2.4rem] p-[4px] bg-[#2a1205] shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
  <div class="rounded-[2.2rem] p-[7px] bg-gradient-to-r from-amber-300 via-pink-400 via-50% to-sky-400">
    <div class="relative rounded-[1.85rem] border-[3px] border-[#3b1c08] {paddingClass} bg-amber-900">
      <!-- Clipped Inner Blurred Backdrop + Wooden Deck Strip -->
      <div class="absolute inset-0 rounded-[1.68rem] overflow-hidden pointer-events-none">
        {#if showBackdrop}
          <img
            src={backdropSrc}
            alt=""
            aria-hidden="true"
            class="w-full h-full object-cover blur-[6px] scale-105 brightness-90"
          />
        {/if}
        <div class="absolute inset-0 bg-gradient-to-b from-slate-900/25 via-slate-900/15 to-[#4a2810]/85"></div>
        {#if showDeckStrip}
          <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-[#8b4c20]/90 to-[#592c0d]/95 border-t-4 border-[#a15c2b]/85"></div>
        {/if}
      </div>

      {#if title}
        <div class="absolute -top-9 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center whitespace-nowrap">
          <ArcadeTitle
            text={title}
            widthClass={titleWidthClass}
            viewBoxWidth={titleViewBoxWidth}
            fontSize={titleFontSize}
          />
        </div>
      {/if}

      {#if showClose}
        <button
          type="button"
          on:click={() => dispatch("close")}
          aria-label={closeLabel}
          title="Close"
          class="absolute -top-5 -right-5 z-30 w-12 h-12 rounded-2xl bg-gradient-to-b from-rose-400 via-red-500 to-red-700 border-[3px] border-white ring-2 ring-[#431407] shadow-[0_4px_0_#431407,0_8px_16px_rgba(0,0,0,0.5)] hover:brightness-110 hover:scale-105 active:translate-y-0.5 flex items-center justify-center transition-all cursor-pointer"
        >
          <svg viewBox="0 0 24 24" class="w-6 h-6" fill="none">
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="#ffffff"
              stroke-width="4.2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      {/if}

      <div class="relative z-10">
        <slot />
      </div>
    </div>
  </div>
</div>

