<script>
  import { createEventDispatcher } from "svelte";

  export let isReady = false;
  export let isPlaytestMode = false;
  export let currentFps = 60;
  export let activeTheme = "carnival_park";
  export let showBoundary = true;
  export let isTrackPathMode = false;
  export let isEraseMode = false;
  export let saveFeedback = "";
  export let savedCourseId = "";
  export let editingLabel = "";
  export let canSaveCopy = false;

  const dispatch = createEventDispatcher();
</script>

<!-- Top Navigation Header (Cartoon Arcade Wood) -->
<header class="absolute top-3 left-3 right-3 flex flex-wrap justify-between items-start gap-2 pointer-events-none">
  <!-- Left: Status & Mode -->
  <div class="pointer-events-auto rounded-2xl p-[3px] bg-[#2a1205] shadow-[0_5px_0_#2a1205,0_10px_20px_rgba(0,0,0,0.4)]">
    <div class="rounded-[0.85rem] bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 border-[2.5px] border-amber-300/90 px-3.5 py-2 flex items-center gap-2.5 text-white">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full border border-white {isReady ? 'bg-lime-400 animate-pulse' : 'bg-amber-300'}"></span>
        <span class="font-black text-xs md:text-sm text-amber-50 drop-shadow">
          {isPlaytestMode ? "⛳ Playtest Mode" : "🛠️ Track Runner Editor"}
        </span>
      </div>
      <span class="text-xs text-amber-300/50 font-black">|</span>
      <span class="text-xs font-black text-lime-300">{currentFps} FPS</span>
      {#if editingLabel}
        <span class="text-xs text-amber-300/50 font-black">|</span>
        <span class="text-xs font-black text-amber-200 truncate max-w-44" title={editingLabel}>
          {editingLabel}
        </span>
      {/if}
    </div>
  </div>

  <!-- Center: Primary Action Toolbar -->
  <div class="pointer-events-auto rounded-2xl p-[3px] bg-[#2a1205] shadow-[0_5px_0_#2a1205,0_10px_20px_rgba(0,0,0,0.4)]">
    <div class="rounded-[0.85rem] bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 border-[2.5px] border-amber-300/90 p-1.5 flex flex-wrap items-center gap-1.5">
      {#if !isPlaytestMode}
        <div class="flex items-center bg-black/35 rounded-xl p-0.5 border border-amber-300/30">
          <button
            on:click={() => dispatch("setTheme", "carnival_park")}
            class="px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer {activeTheme === 'carnival_park' ? 'bg-gradient-to-b from-amber-300 to-orange-500 text-[#431407] shadow' : 'text-amber-100/80 hover:text-white'}"
          >
            🎪 Carnival
          </button>
          <button
            on:click={() => dispatch("setTheme", "country_club")}
            class="px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer {activeTheme === 'country_club' ? 'bg-gradient-to-b from-lime-400 to-emerald-600 text-white shadow' : 'text-amber-100/80 hover:text-white'}"
          >
            🏌️ Classic
          </button>
        </div>

        <button
          on:click={() => dispatch("openWfc")}
          class="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-white/80 text-white text-xs font-black shadow-[0_2px_0_#1e3a8a] hover:brightness-110 active:translate-y-0.5 transition-all cursor-pointer"
          title="Auto-generate a complete hole using WFC"
        >
          <span>🤖</span>
          <span>Auto-Gen</span>
        </button>

        <a
          href="/courses"
          class="px-2.5 py-1.5 rounded-xl bg-amber-50/95 hover:bg-white border-2 border-[#431407] text-[#431407] text-xs font-black shadow-[0_2px_0_#431407] transition-all"
          title="Browse Official Tours & My Holes to edit or bundle"
        >
          📚 Courses
        </a>

        <button
          on:click={() => dispatch("newHole")}
          class="px-2.5 py-1.5 rounded-xl bg-gradient-to-b from-amber-300 to-orange-500 border-2 border-white/80 text-[#431407] text-xs font-black shadow-[0_2px_0_#78350f] hover:brightness-110 transition-all cursor-pointer"
          title="Start a brand-new blank hole"
        >
          ✨ New Hole
        </button>

        <button
          on:click={() => dispatch("autoDecorate")}
          class="px-2.5 py-1.5 rounded-xl bg-black/30 hover:bg-black/45 border border-amber-300/35 text-lime-200 text-xs font-black transition-colors cursor-pointer"
          title="Decorate surroundings with hill knolls, trees, boulders & toadstools"
        >
          🌲 Decorate
        </button>

        <button
          on:click={() => dispatch("toggleBoundary")}
          class="px-2.5 py-1.5 rounded-xl bg-black/30 hover:bg-black/45 border border-amber-300/35 text-xs font-black transition-colors cursor-pointer {showBoundary ? 'text-amber-300' : 'text-amber-200/45'}"
          title="Toggle park perimeter fence"
        >
          🪵 Fence
        </button>

        <button
          on:click={() => dispatch("frameCamera")}
          class="px-2.5 py-1.5 rounded-xl bg-black/30 hover:bg-black/45 border border-amber-300/35 text-sky-200 text-xs font-black transition-colors cursor-pointer"
          title="Center camera on course (F)"
        >
          🎯 Frame
        </button>

        <button
          on:click={() => dispatch("toggleTrackPath")}
          class="px-2.5 py-1.5 rounded-xl border-2 text-xs font-black transition-all cursor-pointer {isTrackPathMode ? 'bg-gradient-to-b from-sky-400 to-blue-600 border-white text-white shadow-[0_2px_0_#1e3a8a]' : 'bg-black/30 border-amber-300/35 hover:bg-black/45 text-amber-100'}"
          title="Edit spline track path, handles & elevation (T)"
        >
          〰️ Edit Track
        </button>

        <button
          on:click={() => dispatch("toggleErase")}
          class="px-2.5 py-1.5 rounded-xl border-2 text-xs font-black transition-all cursor-pointer {isEraseMode ? 'bg-gradient-to-b from-rose-400 to-red-600 border-white text-white shadow-[0_2px_0_#7f1d1d]' : 'bg-black/30 border-amber-300/35 hover:bg-black/45 text-amber-100'}"
          title="Erase props or non-root track tiles (X)"
        >
          🧹 Erase
        </button>

        <button
          on:click={() => dispatch("clearToTee")}
          class="px-2.5 py-1.5 rounded-xl bg-black/30 hover:bg-rose-600/60 border border-amber-300/35 text-amber-100 hover:text-white text-xs font-black transition-colors cursor-pointer"
          title="Reset workspace to single tee tile"
        >
          🗑️ Clear
        </button>

        <div class="w-px h-5 bg-amber-300/30 mx-0.5"></div>

        <button
          on:click={() => dispatch("undo")}
          class="px-2 py-1.5 rounded-xl bg-black/30 hover:bg-black/45 border border-amber-300/30 text-amber-100 text-xs font-black transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          ↩️ Undo
        </button>
        <button
          on:click={() => dispatch("redo")}
          class="px-2 py-1.5 rounded-xl bg-black/30 hover:bg-black/45 border border-amber-300/30 text-amber-100 text-xs font-black transition-colors cursor-pointer"
          title="Redo (Ctrl+Y)"
        >
          ↪️ Redo
        </button>
      {/if}

      <!-- Playtest Mode Toggle -->
      <button
        on:click={() => dispatch("togglePlaytest")}
        class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border-2 border-white font-black text-xs shadow transition-all active:translate-y-0.5 cursor-pointer {isPlaytestMode ? 'bg-gradient-to-b from-amber-300 to-orange-500 text-[#431407] shadow-[0_2px_0_#78350f]' : 'bg-gradient-to-b from-lime-400 to-emerald-600 text-white shadow-[0_2px_0_#14532d]'}"
      >
        <span>{isPlaytestMode ? "⏹️ Exit Test" : "▶️ Test Putt"}</span>
      </button>

      {#if !isPlaytestMode}
        <button
          on:click={() => dispatch("saveCourse")}
          class="px-3 py-1.5 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-white text-white text-xs font-black shadow-[0_2px_0_#1e3a8a] hover:brightness-110 transition-all cursor-pointer"
        >
          {saveFeedback || "💾 Save"}
        </button>
        {#if canSaveCopy}
          <button
            on:click={() => dispatch("saveAsCopy")}
            class="px-2.5 py-1.5 rounded-xl bg-gradient-to-b from-fuchsia-400 to-purple-600 border-2 border-white text-white text-xs font-black shadow-[0_2px_0_#4a044e] hover:brightness-110 transition-all cursor-pointer"
            title="Save a separate custom copy instead of updating this hole in-place"
          >
            📄 Save Copy
          </button>
        {/if}
        {#if savedCourseId}
          <a
            href="/play?course={savedCourseId}"
            class="px-3 py-1.5 rounded-xl bg-gradient-to-b from-fuchsia-400 to-purple-600 border-2 border-white text-white text-xs font-black shadow-[0_2px_0_#4a044e] hover:brightness-110 transition-all"
          >
            🎮 Play Saved
          </a>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Right: Back to Home -->
  <a
    href="/"
    class="pointer-events-auto rounded-2xl p-[3px] bg-[#2a1205] shadow-[0_5px_0_#2a1205] hover:scale-[1.03] transition-transform"
  >
    <span class="block rounded-[0.85rem] bg-gradient-to-b from-rose-400 via-red-500 to-red-700 border-[2.5px] border-white px-3.5 py-2 text-xs font-black text-white">
      Exit to Menu
    </span>
  </a>
</header>
