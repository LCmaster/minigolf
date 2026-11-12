<script>
  import { createEventDispatcher } from "svelte";
  import { computeTotalPar } from "$lib/engine/course/CourseStorage";

  export let isCupSunk = false;
  export let isCourseFinished = false;
  export let currentHole;
  export let activeCourse;
  export let strokes = 0;
  export let totalScore = 0;
  export let scoreCard = [];

  const dispatch = createEventDispatcher();

  $: holePar = currentHole?.par ?? 3;
  $: totalCoursePar = computeTotalPar(activeCourse?.holes ?? []);
  $: totalStrokes = scoreCard.reduce((acc, curr) => acc + curr.strokes, 0);
  $: formattedTotal = totalScore === 0 ? "E" : totalScore > 0 ? `+${totalScore}` : `${totalScore}`;
  $: isLastHole = (currentHole?.holeNumber ?? 1) >= (activeCourse?.holes?.length ?? 1);

  function getCallout(s, par) {
    if (s === 1) return { label: "🌟 HOLE IN ONE!", color: "from-yellow-300 to-amber-500 text-[#431407]" };
    if (s <= par - 2) return { label: "🦅 EAGLE!", color: "from-emerald-300 to-teal-500 text-white" };
    if (s === par - 1) return { label: "✨ BIRDIE!", color: "from-lime-300 to-emerald-500 text-white" };
    if (s === par) return { label: "👍 PAR", color: "from-sky-300 to-blue-500 text-white" };
    if (s === par + 1) return { label: "BOGEY", color: "from-amber-300 to-orange-500 text-white" };
    return { label: `+${s - par} OVER PAR`, color: "from-rose-400 to-red-600 text-white" };
  }

  $: callout = getCallout(strokes, holePar);
</script>

<!-- Hole Complete Cartoon Modal -->
{#if isCupSunk && !isCourseFinished}
  <div class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div class="relative w-full max-w-md rounded-[2.4rem] p-[4px] bg-[#2a1205] shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
      <div class="rounded-[2.2rem] p-[7px] bg-gradient-to-r from-amber-300 via-pink-400 via-50% to-sky-400">
        <div class="relative rounded-[1.85rem] border-[3px] border-[#3b1c08] px-6 pt-12 pb-7 bg-sky-300">
          <!-- Clipped Blurred Backdrop -->
          <div class="absolute inset-0 rounded-[1.68rem] overflow-hidden pointer-events-none">
            <img
              src="/courses/carnival-park-card.png"
              alt=""
              aria-hidden="true"
              class="w-full h-full object-cover blur-[6px] scale-105 brightness-90"
            />
            <div class="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-transparent to-[#4a2810]/80"></div>
            <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-[#8b4c20]/90 to-[#592c0d]/95 border-t-4 border-[#a15c2b]/85"></div>
          </div>

          <!-- Floating Cartoon SVG Header -->
          <div class="absolute -top-9 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap">
            <svg
              viewBox="0 0 480 88"
              class="w-64 md:w-80 h-auto drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] overflow-visible"
            >
              <defs>
                <linearGradient id="sinkTitleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ffffff" />
                  <stop offset="55%" stop-color="#fef08a" />
                  <stop offset="100%" stop-color="#fb923c" />
                </linearGradient>
              </defs>
              <text
                x="240"
                y="66"
                text-anchor="middle"
                font-family="'Fredoka', 'Baloo 2', 'Comic Sans MS', system-ui, sans-serif"
                font-weight="900"
                font-size="52"
                letter-spacing="2"
                fill="url(#sinkTitleGrad)"
                stroke="#431407"
                stroke-width="14"
                stroke-linejoin="round"
                style="paint-order: stroke fill;"
              >
                HOLE {currentHole?.holeNumber ?? 1} SINK!
              </text>
            </svg>
          </div>

          <div class="relative z-10 flex flex-col items-center gap-4 text-center">
            <div class="px-5 py-2 rounded-full bg-gradient-to-b {callout.color} border-[3px] border-white ring-2 ring-[#431407] shadow-lg text-lg font-black tracking-wider uppercase">
              {callout.label}
            </div>

            <div class="grid grid-cols-2 gap-3 w-full max-w-xs">
              <div class="rounded-2xl bg-amber-50/95 border-[3px] border-[#431407] p-3 shadow-[0_4px_0_#431407]">
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-500">STROKES</div>
                <div class="text-3xl font-black text-amber-600">{strokes}</div>
              </div>
              <div class="rounded-2xl bg-amber-50/95 border-[3px] border-[#431407] p-3 shadow-[0_4px_0_#431407]">
                <div class="text-[10px] font-black uppercase tracking-widest text-slate-500">PAR</div>
                <div class="text-3xl font-black text-sky-600">{holePar}</div>
              </div>
            </div>

            <button
              on:click={() => dispatch("nextHole")}
              class="group relative w-56 h-13 py-2.5 rounded-full bg-gradient-to-b from-[#bef264] via-[#65a30d] to-[#365314] border-[3px] border-white ring-2 ring-[#1a2e05] shadow-[0_5px_0_#1a2e05,0_8px_16px_rgba(0,0,0,0.45)] hover:brightness-105 hover:scale-[1.03] active:translate-y-0.5 transition-all flex items-center justify-center gap-2 overflow-hidden cursor-pointer"
            >
              <span class="absolute inset-x-3 top-1 h-3 rounded-full bg-white/35 pointer-events-none"></span>
              <span class="text-lg font-black tracking-wider text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]">
                {isLastHole ? "VIEW RESULTS ▶" : "NEXT HOLE ▶"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Championship Scorecard Modal -->
{#if isCourseFinished}
  <div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
    <div class="relative w-full max-w-xl rounded-[2.4rem] p-[4px] bg-[#2a1205] shadow-[0_24px_60px_rgba(0,0,0,0.75)]">
      <div class="rounded-[2.2rem] p-[7px] bg-gradient-to-r from-amber-300 via-pink-400 via-50% to-sky-400">
        <div class="relative rounded-[1.85rem] border-[3px] border-[#3b1c08] px-5 pt-12 pb-6 md:px-8 bg-sky-300">
          <!-- Clipped Blurred Backdrop -->
          <div class="absolute inset-0 rounded-[1.68rem] overflow-hidden pointer-events-none">
            <img
              src="/courses/carnival-park-card.png"
              alt=""
              aria-hidden="true"
              class="w-full h-full object-cover blur-[6px] scale-105 brightness-90"
            />
            <div class="absolute inset-0 bg-gradient-to-b from-slate-900/25 via-slate-900/15 to-[#4a2810]/85"></div>
            <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-[#8b4c20]/90 to-[#592c0d]/95 border-t-4 border-[#a15c2b]/85"></div>
          </div>

          <!-- Floating Cartoon SVG Header -->
          <div class="absolute -top-9 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap">
            <svg
              viewBox="0 0 600 88"
              class="w-72 md:w-[440px] h-auto drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] overflow-visible"
            >
              <defs>
                <linearGradient id="completeTitleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ffffff" />
                  <stop offset="55%" stop-color="#fef08a" />
                  <stop offset="100%" stop-color="#fb923c" />
                </linearGradient>
              </defs>
              <text
                x="300"
                y="66"
                text-anchor="middle"
                font-family="'Fredoka', 'Baloo 2', 'Comic Sans MS', system-ui, sans-serif"
                font-weight="900"
                font-size="48"
                letter-spacing="2"
                fill="url(#completeTitleGrad)"
                stroke="#431407"
                stroke-width="14"
                stroke-linejoin="round"
                style="paint-order: stroke fill;"
              >
                COURSE COMPLETE!
              </text>
            </svg>
          </div>

          <div class="relative z-10 space-y-4">
            <!-- Scorecard Table -->
            <div class="rounded-2xl bg-amber-50/95 border-[3px] border-[#431407] overflow-hidden shadow-[0_5px_0_#431407] text-xs md:text-sm">
              <div class="grid grid-cols-4 p-2.5 bg-amber-300/80 font-black text-[#431407] border-b-2 border-[#431407] text-center">
                <span>HOLE</span>
                <span>PAR</span>
                <span>STROKES</span>
                <span>+/-</span>
              </div>
              <div class="max-h-60 overflow-y-auto divide-y divide-amber-900/15">
                {#each scoreCard as s}
                  <div class="grid grid-cols-4 p-2 text-center font-bold text-slate-700">
                    <span class="font-black text-[#431407]">{s.hole}</span>
                    <span>{s.par}</span>
                    <span class="font-black text-slate-900">{s.strokes}</span>
                    <span
                      class="font-black {s.relative < 0
                        ? 'text-emerald-600'
                        : s.relative > 0
                          ? 'text-rose-600'
                          : 'text-slate-500'}"
                    >
                      {s.relative === 0 ? "E" : s.relative > 0 ? `+${s.relative}` : s.relative}
                    </span>
                  </div>
                {/each}
              </div>
              <div class="grid grid-cols-4 p-3 bg-amber-200 border-t-2 border-[#431407] font-black text-[#431407] text-center">
                <span>TOTAL</span>
                <span>{totalCoursePar}</span>
                <span class="text-amber-800">{totalStrokes}</span>
                <span class={totalScore < 0 ? "text-emerald-700" : totalScore > 0 ? "text-rose-700" : "text-[#431407]"}>
                  {formattedTotal}
                </span>
              </div>
            </div>

            <div class="flex flex-wrap gap-3 justify-center pt-1">
              <button
                on:click={() => dispatch("restartCourse")}
                class="flex-1 min-w-[140px] h-12 rounded-full bg-gradient-to-b from-[#bef264] via-[#65a30d] to-[#365314] border-[3px] border-white ring-2 ring-[#1a2e05] shadow-[0_4px_0_#1a2e05] hover:brightness-105 active:translate-y-0.5 text-sm font-black tracking-wider text-white transition-all cursor-pointer"
              >
                PLAY AGAIN
              </button>
              <a
                href="/"
                class="flex-1 min-w-[140px] h-12 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 border-[3px] border-white ring-2 ring-[#1e3a8a] shadow-[0_4px_0_#1e3a8a] hover:brightness-105 active:translate-y-0.5 text-sm font-black tracking-wider text-white transition-all flex items-center justify-center"
              >
                HOME MENU
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
