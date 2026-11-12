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

<!-- Top Navigation Header -->
<header class="absolute top-4 left-4 right-4 flex justify-between items-center pointer-events-none">
  <!-- Left: Status & Mode -->
  <div class="bg-slate-900/90 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-auto">
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full {isReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
      <span class="font-bold text-sm text-white font-sans">
        {isPlaytestMode ? '⛳ Playtest Mode' : '🛠️ Track Runner Editor'}
      </span>
    </div>
    <span class="text-xs text-gray-500 font-mono">|</span>
    <span class="text-xs font-mono text-emerald-400 font-bold">{currentFps} FPS</span>
    {#if editingLabel}
      <span class="text-xs text-gray-500 font-mono">|</span>
      <span class="text-xs font-mono text-amber-300 font-bold truncate max-w-44" title={editingLabel}>
        {editingLabel}
      </span>
    {/if}
  </div>

  <!-- Center: Primary Action Toolbar -->
  <div class="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl flex items-center gap-1.5 pointer-events-auto">
    {#if !isPlaytestMode}
      <div class="flex items-center bg-black/30 rounded-xl p-0.5 border border-white/10">
        <button
          on:click={() => dispatch("setTheme", "carnival_park")}
          class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all {activeTheme === 'carnival_park' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}"
        >
          🎪 Carnival
        </button>
        <button
          on:click={() => dispatch("setTheme", "country_club")}
          class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all {activeTheme === 'country_club' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}"
        >
          🏌️ Classic
        </button>
      </div>

      <button
        on:click={() => dispatch("openWfc")}
        class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-400/30 text-cyan-300 text-xs font-bold font-mono transition-all active:scale-95"
        title="Auto-generate a complete hole using WFC"
      >
        <span>🤖</span>
        <span>Auto-Gen</span>
      </button>

      <a
        href="/courses"
        class="px-2.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 text-xs font-bold font-mono transition-all"
        title="Browse Official Tours & My Holes to edit or bundle"
      >
        📚 Courses
      </a>

      <button
        on:click={() => dispatch("newHole")}
        class="px-2.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 text-xs font-bold font-mono transition-all"
        title="Start a brand-new blank hole"
      >
        ✨ New Hole
      </button>

      <button
        on:click={() => dispatch("autoDecorate")}
        class="px-2.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-xs font-bold font-mono transition-all"
        title="Decorate surroundings with hill knolls, trees, boulders & toadstools"
      >
        🌲 Decorate
      </button>

      <button
        on:click={() => dispatch("toggleBoundary")}
        class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold font-mono transition-colors {showBoundary ? 'text-amber-300' : 'text-gray-500'}"
        title="Toggle park perimeter fence"
      >
        🪵 Fence
      </button>

      <button
        on:click={() => dispatch("frameCamera")}
        class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-bold font-mono transition-colors"
        title="Center camera on course (F)"
      >
        🎯 Frame
      </button>

      <button
        on:click={() => dispatch("toggleTrackPath")}
        class="px-2.5 py-2 rounded-xl border text-xs font-bold font-mono transition-all {isTrackPathMode ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-300'}"
        title="Edit spline track path, handles & elevation (T)"
      >
        〰️ Edit Track
      </button>

      <button
        on:click={() => dispatch("toggleErase")}
        class="px-2.5 py-2 rounded-xl border text-xs font-bold font-mono transition-all {isEraseMode ? 'bg-red-500/30 border-red-400 text-red-200 shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-300'}"
        title="Erase props or non-root track tiles (X)"
      >
        🧹 Erase
      </button>

      <button
        on:click={() => dispatch("clearToTee")}
        class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-200 text-xs font-bold font-mono transition-colors"
        title="Reset workspace to single tee tile"
      >
        🗑️ Clear
      </button>

      <div class="w-px h-5 bg-white/10 mx-1"></div>

      <button
        on:click={() => dispatch("undo")}
        class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors"
        title="Undo (Ctrl+Z)"
      >
        ↩️ Undo
      </button>
      <button
        on:click={() => dispatch("redo")}
        class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors"
        title="Redo (Ctrl+Y)"
      >
        ↪️ Redo
      </button>
    {/if}

    <!-- Playtest Mode Toggle -->
    <button
      on:click={() => dispatch("togglePlaytest")}
      class="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs font-mono transition-all shadow-lg active:scale-95 {isPlaytestMode ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}"
    >
      <span>{isPlaytestMode ? '⏹️ Exit Test' : '▶️ Test Putt'}</span>
    </button>

    {#if !isPlaytestMode}
      <button
        on:click={() => dispatch("saveCourse")}
        class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono transition-all"
      >
        {saveFeedback || '💾 Save'}
      </button>
      {#if canSaveCopy}
        <button
          on:click={() => dispatch("saveAsCopy")}
          class="px-2.5 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold font-mono transition-all"
          title="Save a separate custom copy instead of updating this hole in-place"
        >
          📄 Save Copy
        </button>
      {/if}
      {#if savedCourseId}
        <a
          href="/play?course={savedCourseId}"
          class="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-mono transition-all"
        >
          🎮 Play Saved
        </a>
      {/if}
    {/if}
  </div>

  <!-- Right: Back to Home -->
  <a
    href="/"
    class="bg-slate-900/90 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-300 hover:text-white pointer-events-auto transition-colors"
  >
    Exit to Menu
  </a>
</header>

