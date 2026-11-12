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
  $: prevCourse = safeCourses.length > 1 ? safeCourses[(clampedIndex - 1 + safeCourses.length) % safeCourses.length] : null;
  $: nextCourse = safeCourses.length > 1 ? safeCourses[(clampedIndex + 1) % safeCourses.length] : null;

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
    <!-- Rainbow-Bordered Wooden Arcade Modal -->
    <div class="relative w-full max-w-3xl rounded-[2.2rem] p-[5px] bg-gradient-to-r from-amber-300 via-sky-400 to-fuchsia-400 shadow-[0_24px_60px_rgba(0,0,0,0.65)]">
      <div class="relative rounded-[1.95rem] bg-gradient-to-b from-[#6b3f1d] via-[#4a2810] to-[#361b08] border-2 border-amber-200/40 px-5 pt-10 pb-6 md:px-10">
        <!-- Floating Cartoon Title + Back Button -->
        <div class="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-3 whitespace-nowrap">
          <h2 class="select-card-title text-3xl md:text-4xl font-black tracking-wider uppercase text-white">
            SELECT COURSE
          </h2>
          <button
            on:click={closeModal}
            aria-label="Back to Menu"
            title="Back to Menu"
            class="w-11 h-11 rounded-full bg-gradient-to-b from-amber-400 to-orange-600 border-[3px] border-white shadow-[0_4px_0_#7c2d12,0_6px_14px_rgba(0,0,0,0.45)] hover:brightness-110 active:translate-y-0.5 flex items-center justify-center text-xl font-black text-white transition-all cursor-pointer"
          >
            ←
          </button>
        </div>

        <!-- Carousel Stage -->
        <div class="relative flex items-center justify-center gap-3 md:gap-5 pt-2">
          <!-- Left Arrow -->
          <button
            on:click={() => stepCourse(-1)}
            disabled={safeCourses.length <= 1}
            aria-label="Previous Course"
            class="shrink-0 w-12 h-12 rounded-full bg-gradient-to-b from-pink-400 via-rose-500 to-amber-500 border-[3px] border-white shadow-[0_4px_0_#881337,0_6px_14px_rgba(0,0,0,0.45)] hover:brightness-110 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-default flex items-center justify-center text-2xl font-black text-white transition-all cursor-pointer"
          >
            ◀
          </button>

          <!-- 3-Slot Carousel Display -->
          <div class="flex items-center justify-center gap-4 w-full">
            <!-- Left Flanking Preview (shown when multiple official tours exist) -->
            {#if prevCourse}
              <button
                on:click={() => stepCourse(-1)}
                class="hidden md:flex flex-col w-44 rounded-2xl bg-slate-900/80 border-2 border-white/25 p-2.5 opacity-60 hover:opacity-85 transition-all scale-90 cursor-pointer"
              >
                <img
                  src={getCardArtwork(prevCourse)}
                  alt={prevCourse.name}
                  class="w-full h-28 object-cover rounded-xl mb-2"
                />
                <div class="text-xs font-black uppercase text-white truncate">{prevCourse.name}</div>
              </button>
            {/if}

            <!-- Center Highlighted Active Official Tour Card -->
            <div class="w-full max-w-[330px] rounded-3xl p-1 bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 shadow-[0_10px_30px_rgba(251,191,36,0.35),0_8px_0_#78350f]">
              <div class="rounded-[1.35rem] bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 p-3 flex flex-col items-center gap-3">
                <div class="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border-[3px] border-white shadow-inner bg-sky-300">
                  <img
                    src={getCardArtwork(activeCourse)}
                    alt={activeCourse.name}
                    class="w-full h-full object-cover"
                  />
                  <div class="absolute top-2 left-2 flex items-center gap-1.5">
                    <span class="px-2.5 py-0.5 rounded-full bg-slate-950/75 border border-white/40 text-[10px] font-black tracking-wider text-amber-300 uppercase">
                      {activeCourse.holes.length} HOLES
                    </span>
                    <span class="px-2.5 py-0.5 rounded-full bg-emerald-600/90 border border-white/40 text-[10px] font-black tracking-wider text-white uppercase">
                      PAR {computeTotalPar(activeCourse.holes)}
                    </span>
                  </div>
                </div>

                <h3 class="text-center text-lg md:text-xl font-black uppercase tracking-wide text-white drop-shadow-[0_2px_2px_rgba(67,20,7,0.9)] leading-tight px-1">
                  {activeCourse.name}
                </h3>

                <a
                  href="/play?course={activeCourse.id}"
                  class="group relative w-48 h-12 rounded-full bg-gradient-to-b from-[#a3e635] via-[#65a30d] to-[#3f6212] border-[3px] border-white shadow-[0_5px_0_#1a2e05,0_8px_16px_rgba(0,0,0,0.35)] hover:brightness-105 hover:scale-[1.03] active:translate-y-0.5 transition-all flex items-center justify-center overflow-hidden"
                >
                  <span class="absolute inset-x-3 top-1 h-3 rounded-full bg-white/30 pointer-events-none"></span>
                  <span class="text-xl font-black tracking-wider text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]">
                    PLAY
                  </span>
                </a>
              </div>
            </div>

            <!-- Right Flanking Preview (shown when multiple official tours exist) -->
            {#if nextCourse}
              <button
                on:click={() => stepCourse(1)}
                class="hidden md:flex flex-col w-44 rounded-2xl bg-slate-900/80 border-2 border-white/25 p-2.5 opacity-60 hover:opacity-85 transition-all scale-90 cursor-pointer"
              >
                <img
                  src={getCardArtwork(nextCourse)}
                  alt={nextCourse.name}
                  class="w-full h-28 object-cover rounded-xl mb-2"
                />
                <div class="text-xs font-black uppercase text-white truncate">{nextCourse.name}</div>
              </button>
            {/if}
          </div>

          <!-- Right Arrow -->
          <button
            on:click={() => stepCourse(1)}
            disabled={safeCourses.length <= 1}
            aria-label="Next Course"
            class="shrink-0 w-12 h-12 rounded-full bg-gradient-to-b from-lime-300 via-emerald-500 to-green-700 border-[3px] border-white shadow-[0_4px_0_#14532d,0_6px_14px_rgba(0,0,0,0.45)] hover:brightness-110 active:translate-y-0.5 disabled:opacity-40 disabled:cursor-default flex items-center justify-center text-2xl font-black text-white transition-all cursor-pointer"
          >
            ▶
          </button>
        </div>

        <!-- Pagination Dots & Secondary Link to Hole Browser -->
        <div class="mt-5 flex flex-col items-center gap-2">
          <div class="flex items-center gap-2">
            {#each safeCourses as c, i (c.id)}
              <button
                on:click={() => (selectedIndex = i)}
                aria-label="Select {c.name}"
                class="w-3 h-3 rounded-full border border-white/60 transition-all cursor-pointer {i === clampedIndex
                  ? 'bg-amber-300 scale-125 shadow'
                  : 'bg-white/25 hover:bg-white/45'}"
              ></button>
            {/each}
          </div>

          <a
            href="/courses"
            class="text-xs font-bold text-amber-200/85 hover:text-white underline underline-offset-4 transition-colors"
          >
            Browse Individual Holes &amp; Custom Tours →
          </a>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .select-card-title {
    -webkit-text-stroke: 2px #431407;
    text-shadow:
      0 4px 0 #431407,
      0 8px 14px rgba(0, 0, 0, 0.55);
  }
</style>

