<script>
  import { createEventDispatcher } from "svelte";
  import { carnivalParkCourse } from "$lib/courses/carnivalParkCourse";
  import { computeTotalPar } from "$lib/engine/course/CourseStorage";

  export let isOpen = false;
  export let courses = [carnivalParkCourse];

  const dispatch = createEventDispatcher();

  let selectedIndex = 0;

  $: safeCourses = courses?.length ? courses : [carnivalParkCourse];
  $: clampedIndex = Math.max(0, Math.min(selectedIndex, safeCourses.length - 1));
  $: activeCourse = safeCourses[clampedIndex];
  $: prevCourse =
    safeCourses.length > 1
      ? safeCourses[(clampedIndex - 1 + safeCourses.length) % safeCourses.length]
      : null;
  $: nextCourse =
    safeCourses.length > 1
      ? safeCourses[(clampedIndex + 1) % safeCourses.length]
      : null;

  function stepCourse(delta) {
    if (safeCourses.length <= 1) return;
    selectedIndex = (clampedIndex + delta + safeCourses.length) % safeCourses.length;
  }

  function closeModal() {
    isOpen = false;
    dispatch("close");
  }

  function handleKeydown(ev) {
    if (!isOpen) return;
    if (ev.key === "Escape") closeModal();
    if (ev.key === "ArrowLeft") stepCourse(-1);
    if (ev.key === "ArrowRight") stepCourse(1);
  }

  function getCardArtwork(course) {
    if (course?.theme === "carnival_park") return "/courses/carnival-park-card.png";
    return "/courses/carnival-park-card.png";
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && activeCourse}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
    on:click|self={closeModal}
    role="dialog"
    aria-modal="true"
    aria-label="Select Course"
  >
    <!-- Cartoon Dark Outer Rim + Rainbow Beveled Frame -->
    <div class="relative w-full max-w-3xl rounded-[2.4rem] p-[4px] bg-[#2a1205] shadow-[0_24px_60px_rgba(0,0,0,0.7)]">
      <div class="rounded-[2.2rem] p-[7px] bg-gradient-to-r from-amber-300 via-pink-400 via-50% to-sky-400">
        <div class="relative rounded-[1.85rem] border-[3px] border-[#3b1c08] overflow-hidden px-5 pt-11 pb-6 md:px-10 bg-sky-300">
          <!-- Blurred Active Course Artwork Backdrop -->
          <img
            src={getCardArtwork(activeCourse)}
            alt=""
            aria-hidden="true"
            class="absolute inset-0 w-full h-full object-cover blur-[5px] scale-105 brightness-95 pointer-events-none"
          />
          <div class="absolute inset-0 bg-gradient-to-b from-slate-900/15 via-transparent to-[#4a2810]/70 pointer-events-none"></div>
          <!-- Wooden Deck Strip at the Bottom -->
          <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-[#8b4c20]/90 to-[#592c0d]/95 border-t-4 border-[#a15c2b]/85 pointer-events-none"></div>

          <!-- Floating Cartoon SVG "SELECT COURSE" Header + Back Button -->
          <div class="relative -mt-16 mb-3 flex items-center justify-center gap-2">
            <svg
              viewBox="0 0 540 88"
              class="w-72 md:w-[400px] h-auto drop-shadow-[0_6px_8px_rgba(0,0,0,0.45)] overflow-visible"
              role="heading"
              aria-level="2"
            >
              <defs>
                <linearGradient id="selectTitleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ffffff" />
                  <stop offset="55%" stop-color="#fef08a" />
                  <stop offset="100%" stop-color="#fb923c" />
                </linearGradient>
              </defs>
              <text
                x="270"
                y="66"
                text-anchor="middle"
                font-family="'Fredoka', 'Baloo 2', 'Comic Sans MS', system-ui, sans-serif"
                font-weight="900"
                font-size="54"
                letter-spacing="2"
                fill="url(#selectTitleGrad)"
                stroke="#431407"
                stroke-width="14"
                stroke-linejoin="round"
                style="paint-order: stroke fill;"
              >
                SELECT COURSE
              </text>
            </svg>

            <button
              on:click={closeModal}
              aria-label="Back to Menu"
              title="Back to Menu"
              class="shrink-0 w-12 h-12 rounded-full bg-gradient-to-b from-amber-300 via-orange-500 to-red-600 border-[3px] border-white ring-2 ring-[#431407] shadow-[0_4px_0_#431407,0_6px_14px_rgba(0,0,0,0.45)] hover:brightness-110 hover:scale-105 active:translate-y-0.5 flex items-center justify-center transition-all cursor-pointer"
            >
              <svg viewBox="0 0 24 24" class="w-6 h-6" fill="none">
                <path
                  d="M15 5L7 12L15 19"
                  stroke="#ffffff"
                  stroke-width="4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M8 12H19"
                  stroke="#ffffff"
                  stroke-width="4"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <!-- Carousel Stage -->
          <div class="relative z-10 flex items-center justify-center gap-3 md:gap-6 pt-1">
            <!-- Left Cartoon Arrow Button -->
            <button
              on:click={() => stepCourse(-1)}
              aria-label="Previous Course"
              class="shrink-0 w-14 h-14 rounded-full bg-gradient-to-b from-pink-300 via-rose-500 to-amber-500 border-[3px] border-white ring-2 ring-[#431407] shadow-[0_5px_0_#881337,0_8px_16px_rgba(0,0,0,0.45)] hover:brightness-110 hover:scale-110 active:translate-y-0.5 flex items-center justify-center transition-all cursor-pointer"
            >
              <svg viewBox="0 0 24 24" class="w-7 h-7 -ml-0.5" fill="none">
                <path
                  d="M16 4L6 12L16 20V4Z"
                  fill="#ffffff"
                  stroke="#881337"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            <!-- 3-Slot Carousel Display -->
            <div class="flex items-center justify-center gap-4 w-full">
              {#if prevCourse}
                <button
                  on:click={() => stepCourse(-1)}
                  class="hidden md:flex flex-col w-44 rounded-2xl bg-slate-900/85 border-[3px] border-[#2a1205] p-2.5 opacity-75 hover:opacity-95 transition-all scale-90 cursor-pointer shadow-xl"
                >
                  <img
                    src={getCardArtwork(prevCourse)}
                    alt={prevCourse.name}
                    class="w-full h-28 object-cover rounded-xl mb-2 border border-white/30"
                  />
                  <div class="text-xs font-black uppercase text-white truncate">{prevCourse.name}</div>
                </button>
              {/if}

              <!-- Center Highlighted Active Official Tour Card -->
              <div class="w-full max-w-[340px] rounded-[1.8rem] p-[3px] bg-[#431407] shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
                <div class="rounded-[1.6rem] p-[4px] bg-gradient-to-b from-yellow-100 via-amber-300 to-orange-500">
                  <div class="rounded-[1.35rem] bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 p-3 flex flex-col items-center gap-3">
                    <div class="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border-[3px] border-white shadow-inner bg-sky-300">
                      <img
                        src={getCardArtwork(activeCourse)}
                        alt={activeCourse.name}
                        class="w-full h-full object-cover"
                      />
                      <div class="absolute top-2 left-2 flex items-center gap-1.5">
                        <span class="px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-white/60 text-[10px] font-black tracking-wider text-amber-300 uppercase shadow">
                          {activeCourse.holes.length} HOLES
                        </span>
                        <span class="px-2.5 py-0.5 rounded-full bg-emerald-600/95 border border-white/60 text-[10px] font-black tracking-wider text-white uppercase shadow">
                          PAR {computeTotalPar(activeCourse.holes)}
                        </span>
                      </div>
                    </div>

                    <h3 class="card-course-title text-center text-xl font-black uppercase tracking-wide text-white leading-tight px-1">
                      {activeCourse.name}
                    </h3>

                    <a
                      href="/play?course={activeCourse.id}"
                      class="group relative w-48 h-12 rounded-full bg-gradient-to-b from-[#bef264] via-[#65a30d] to-[#365314] border-[3px] border-white ring-2 ring-[#1a2e05] shadow-[0_5px_0_#1a2e05,0_8px_16px_rgba(0,0,0,0.4)] hover:brightness-105 hover:scale-[1.04] active:translate-y-0.5 transition-all flex items-center justify-center overflow-hidden"
                    >
                      <span class="absolute inset-x-3 top-1 h-3 rounded-full bg-white/35 pointer-events-none"></span>
                      <span class="text-xl font-black tracking-wider text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]">
                        PLAY
                      </span>
                    </a>
                  </div>
                </div>
              </div>

              {#if nextCourse}
                <button
                  on:click={() => stepCourse(1)}
                  class="hidden md:flex flex-col w-44 rounded-2xl bg-slate-900/85 border-[3px] border-[#2a1205] p-2.5 opacity-75 hover:opacity-95 transition-all scale-90 cursor-pointer shadow-xl"
                >
                  <img
                    src={getCardArtwork(nextCourse)}
                    alt={nextCourse.name}
                    class="w-full h-28 object-cover rounded-xl mb-2 border border-white/30"
                  />
                  <div class="text-xs font-black uppercase text-white truncate">{nextCourse.name}</div>
                </button>
              {/if}
            </div>

            <!-- Right Cartoon Arrow Button -->
            <button
              on:click={() => stepCourse(1)}
              aria-label="Next Course"
              class="shrink-0 w-14 h-14 rounded-full bg-gradient-to-b from-lime-300 via-emerald-500 to-green-700 border-[3px] border-white ring-2 ring-[#14532d] shadow-[0_5px_0_#14532d,0_8px_16px_rgba(0,0,0,0.45)] hover:brightness-110 hover:scale-110 active:translate-y-0.5 flex items-center justify-center transition-all cursor-pointer"
            >
              <svg viewBox="0 0 24 24" class="w-7 h-7 ml-0.5" fill="none">
                <path
                  d="M8 4L18 12L8 20V4Z"
                  fill="#ffffff"
                  stroke="#14532d"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>

          <!-- Pagination Dots & Secondary Link to Hole Browser -->
          <div class="relative z-10 mt-5 flex flex-col items-center gap-2">
            <div class="flex items-center gap-2">
              {#each safeCourses as c, i (c.id)}
                <button
                  on:click={() => (selectedIndex = i)}
                  aria-label="Select {c.name}"
                  class="w-3.5 h-3.5 rounded-full border-2 border-[#431407] transition-all cursor-pointer {i === clampedIndex
                    ? 'bg-amber-300 scale-125 shadow'
                    : 'bg-amber-100/40 hover:bg-amber-100/70'}"
                ></button>
              {/each}
            </div>

            <a
              href="/courses"
              class="text-xs font-extrabold text-amber-100 hover:text-white underline underline-offset-4 drop-shadow transition-colors"
            >
              Browse Individual Holes &amp; Custom Tours →
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .card-course-title {
    text-shadow:
      -2px -2px 0 #431407,
      2px -2px 0 #431407,
      -2px 2px 0 #431407,
      2px 2px 0 #431407,
      0 3px 0 #431407;
  }
</style>
