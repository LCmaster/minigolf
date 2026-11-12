<script>
  import { createEventDispatcher } from "svelte";
  import { formatRelativeScore } from "$lib/engine/course/CourseStorage";

  export let availableCourses = [];
  export let activeCourse;
  export let selectedCourseId = "";
  export let currentHole;
  export let strokes = 0;
  export let totalScore = 0;
  export let isMuted = false;

  const dispatch = createEventDispatcher();

  $: formattedTotal = formatRelativeScore(totalScore);
</script>

<!-- Non-blocking HUD Container so canvas aiming/orbiting works everywhere outside widgets -->
<div class="fixed inset-x-0 top-0 z-20 p-3 md:p-4 flex items-start justify-between gap-4 pointer-events-none">
  <!-- Top-Left Wooden Cartoon Scoreboard Card -->
  <div class="pointer-events-auto w-60 rounded-3xl p-[3px] bg-[#2a1205] shadow-[0_6px_0_#2a1205,0_12px_24px_rgba(0,0,0,0.45)]">
    <div class="rounded-[1.35rem] bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 border-[3px] border-amber-300/90 p-3 text-white space-y-2">
      <!-- Course Picker -->
      <select
        bind:value={selectedCourseId}
        on:change={() => dispatch("selectCourse", selectedCourseId)}
        aria-label="Active Course"
        class="w-full rounded-xl bg-black/35 border-2 border-amber-300/40 px-2.5 py-1 text-xs font-black text-amber-200 focus:outline-none focus:border-amber-300 cursor-pointer"
      >
        {#each availableCourses as c (c.id)}
          <option value={c.id} class="bg-amber-950 text-white">{c.name}</option>
        {/each}
      </select>

      <!-- Hole Header & Name -->
      <div class="flex items-center justify-between gap-2 px-0.5">
        <span class="px-2 py-0.5 rounded-full bg-amber-300 text-[#431407] text-[10px] font-black tracking-wider uppercase">
          HOLE {currentHole?.holeNumber ?? 1} / {activeCourse?.holes?.length ?? 1}
        </span>
        <span class="text-[11px] font-extrabold text-amber-100 truncate">
          {currentHole?.name || ""}
        </span>
      </div>

      <!-- PAR & STROKES Tiles -->
      <div class="grid grid-cols-2 gap-2 text-center">
        <div class="rounded-2xl bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-white shadow-[0_3px_0_#1e3a8a] py-1.5 px-2">
          <div class="text-[9px] font-black tracking-widest text-sky-100 uppercase">PAR</div>
          <div class="text-2xl font-black text-white leading-tight drop-shadow">{currentHole?.par ?? 3}</div>
        </div>
        <div class="rounded-2xl bg-gradient-to-b from-lime-400 to-emerald-600 border-2 border-white shadow-[0_3px_0_#14532d] py-1.5 px-2">
          <div class="text-[9px] font-black tracking-widest text-lime-100 uppercase">STROKES</div>
          <div class="text-2xl font-black text-white leading-tight drop-shadow">{strokes}</div>
        </div>
      </div>

      <!-- Running Course Score -->
      <div class="flex items-center justify-between px-2 py-1 rounded-xl bg-black/30 border border-amber-300/25 text-xs font-extrabold">
        <span class="text-amber-200 uppercase tracking-wide text-[10px]">Total</span>
        <span
          class="font-black {totalScore < 0
            ? 'text-emerald-300'
            : totalScore > 0
              ? 'text-rose-300'
              : 'text-amber-100'}"
        >
          {formattedTotal}
        </span>
      </div>
    </div>
  </div>

  <!-- Top-Right Circular Glossy Arcade Utility Buttons -->
  <div class="pointer-events-auto flex items-center gap-2">
    <button
      on:click={() => dispatch("toggleOverview")}
      aria-label="Toggle Overview"
      title="Toggle Tactical Overview (Spacebar)"
      class="w-12 h-12 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 border-[3px] border-white ring-2 ring-[#1e3a8a] shadow-[0_4px_0_#1e3a8a,0_6px_14px_rgba(0,0,0,0.4)] hover:brightness-110 hover:scale-105 active:translate-y-0.5 flex items-center justify-center text-xl transition-all cursor-pointer"
    >
      🔭
    </button>

    <button
      on:click={() => dispatch("toggleAudio")}
      aria-label="Toggle Audio"
      title={isMuted ? "Unmute Audio" : "Mute Audio"}
      class="w-12 h-12 rounded-full bg-gradient-to-b from-amber-300 to-orange-500 border-[3px] border-white ring-2 ring-[#78350f] shadow-[0_4px_0_#78350f,0_6px_14px_rgba(0,0,0,0.4)] hover:brightness-110 hover:scale-105 active:translate-y-0.5 flex items-center justify-center text-xl transition-all cursor-pointer"
    >
      {isMuted ? "🔇" : "🔊"}
    </button>

    <button
      on:click={() => dispatch("respawn")}
      aria-label="Respawn Ball"
      title="Respawn Ball"
      class="w-12 h-12 rounded-full bg-gradient-to-b from-fuchsia-400 to-purple-600 border-[3px] border-white ring-2 ring-[#4a044e] shadow-[0_4px_0_#4a044e,0_6px_14px_rgba(0,0,0,0.4)] hover:brightness-110 hover:scale-105 active:translate-y-0.5 flex items-center justify-center text-xl transition-all cursor-pointer"
    >
      🔄
    </button>

    <a
      href="/"
      aria-label="Back to Home Menu"
      title="Home Menu"
      class="w-12 h-12 rounded-full bg-gradient-to-b from-rose-400 to-red-600 border-[3px] border-white ring-2 ring-[#7f1d1d] shadow-[0_4px_0_#7f1d1d,0_6px_14px_rgba(0,0,0,0.4)] hover:brightness-110 hover:scale-105 active:translate-y-0.5 flex items-center justify-center text-xl transition-all"
    >
      🏠
    </a>
  </div>
</div>

