<script>
  export let isOpen = false;
  export let onClose = () => {};

  function handleKeydown(ev) {
    if (isOpen && ev.key === "Escape") {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Cartoon Dark Outer Rim + Rainbow Beveled Frame matching SELECT COURSE -->
  <div class="relative w-[92vw] max-w-2xl rounded-[2.4rem] p-[4px] bg-[#2a1205] shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
    <div class="rounded-[2.2rem] p-[7px] bg-gradient-to-r from-amber-300 via-pink-400 via-50% to-sky-400">
      <div class="relative rounded-[1.85rem] border-[3px] border-[#3b1c08] px-5 pt-12 pb-6 md:px-9 bg-sky-300">
        <!-- Clipped Inner Blurred Course Backdrop + Wooden Deck Strip -->
        <div class="absolute inset-0 rounded-[1.68rem] overflow-hidden pointer-events-none">
          <img
            src="/courses/carnival-park-card.png"
            alt=""
            aria-hidden="true"
            class="w-full h-full object-cover blur-[6px] scale-105 brightness-90"
          />
          <div class="absolute inset-0 bg-gradient-to-b from-slate-900/25 via-slate-900/15 to-[#4a2810]/80"></div>
          <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-[#8b4c20]/90 to-[#592c0d]/95 border-t-4 border-[#a15c2b]/85"></div>
        </div>

        <!-- Floating Cartoon SVG "HOW TO PLAY" Header Straddling Top Border -->
        <div class="absolute -top-9 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center whitespace-nowrap">
          <svg
            viewBox="0 0 500 88"
            class="w-64 md:w-[370px] h-auto drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] overflow-visible"
            role="heading"
            aria-level="2"
          >
            <defs>
              <linearGradient id="howToPlayTitleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="55%" stop-color="#fef08a" />
                <stop offset="100%" stop-color="#fb923c" />
              </linearGradient>
            </defs>
            <text
              x="250"
              y="66"
              text-anchor="middle"
              font-family="'Fredoka', 'Baloo 2', 'Comic Sans MS', system-ui, sans-serif"
              font-weight="900"
              font-size="54"
              letter-spacing="2"
              fill="url(#howToPlayTitleGrad)"
              stroke="#431407"
              stroke-width="14"
              stroke-linejoin="round"
              style="paint-order: stroke fill;"
            >
              HOW TO PLAY
            </text>
          </svg>
        </div>

        <!-- Upper-Right Close ("X") Button Straddling Corner -->
        <button
          on:click={onClose}
          aria-label="Close How to Play"
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

        <!-- Content Cards -->
        <div class="relative z-10 flex flex-col gap-3.5 text-slate-900">
          <!-- Rules -->
          <div class="rounded-2xl bg-amber-50/95 border-[3px] border-[#431407] p-4 shadow-[0_4px_0_#431407]">
            <h3 class="font-black text-base uppercase tracking-wider text-emerald-700 mb-1">
              ⛳ Rules
            </h3>
            <p class="font-bold text-sm leading-relaxed text-slate-700">
              Put the ball into the hole with the fewest shots possible!
            </p>
          </div>

          <!-- Controls -->
          <div class="rounded-2xl bg-amber-50/95 border-[3px] border-[#431407] p-4 shadow-[0_4px_0_#431407]">
            <h3 class="font-black text-base uppercase tracking-wider text-amber-600 mb-2">
              🎯 Controls
            </h3>
            <ol class="flex flex-col gap-2 font-bold text-sm text-slate-700">
              <li class="flex items-start gap-2.5">
                <span class="w-6 h-6 flex justify-center items-center shrink-0 rounded-full bg-amber-500 border-2 border-[#431407] text-white text-xs font-black">1</span>
                <span>Click/tap the white translucent ball over the golf ball.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-6 h-6 flex justify-center items-center shrink-0 rounded-full bg-amber-500 border-2 border-[#431407] text-white text-xs font-black">2</span>
                <span>Drag in the <strong class="text-slate-900">opposite</strong> direction you want the ball to go.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-6 h-6 flex justify-center items-center shrink-0 rounded-full bg-amber-500 border-2 border-[#431407] text-white text-xs font-black">3</span>
                <span>An indicator will appear showing the trajectory.</span>
              </li>
              <li class="flex items-start gap-2.5">
                <span class="w-6 h-6 flex justify-center items-center shrink-0 rounded-full bg-amber-500 border-2 border-[#431407] text-white text-xs font-black">4</span>
                <span>The further you drag, the harder you will hit the ball!</span>
              </li>
            </ol>
          </div>

          <!-- Tips -->
          <div class="rounded-2xl bg-amber-50/95 border-[3px] border-[#431407] p-4 shadow-[0_4px_0_#431407]">
            <h3 class="font-black text-base uppercase tracking-wider text-orange-600 mb-1.5">
              💡 Tips
            </h3>
            <ul class="flex flex-col gap-1.5 font-bold text-sm text-slate-700">
              <li class="flex items-center gap-2.5">
                <span class="w-2.5 h-2.5 rounded-full bg-orange-500 border border-[#431407] shrink-0"></span>
                <span>To cancel a shot, just drag the cursor back into the ball.</span>
              </li>
              <li class="flex items-center gap-2.5">
                <span class="w-2.5 h-2.5 rounded-full bg-orange-500 border border-[#431407] shrink-0"></span>
                <span>Use the walls and obstacles to bounce to your advantage.</span>
              </li>
            </ul>
          </div>

          <!-- Bottom Glossy Action Button -->
          <div class="flex justify-center pt-1">
            <button
              on:click={onClose}
              class="group relative w-44 h-11 rounded-full bg-gradient-to-b from-[#bef264] via-[#65a30d] to-[#365314] border-[3px] border-white ring-2 ring-[#1a2e05] shadow-[0_5px_0_#1a2e05,0_8px_16px_rgba(0,0,0,0.4)] hover:brightness-105 hover:scale-[1.04] active:translate-y-0.5 transition-all flex items-center justify-center overflow-hidden cursor-pointer"
            >
              <span class="absolute inset-x-3 top-1 h-2.5 rounded-full bg-white/35 pointer-events-none"></span>
              <span class="text-lg font-black tracking-wider text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]">
                GOT IT!
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
