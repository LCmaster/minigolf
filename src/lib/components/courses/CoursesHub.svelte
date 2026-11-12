<script>
  import { onMount } from "svelte";
  import { carnivalParkCourse } from "$lib/courses/carnivalParkCourse";
  import {
    bundleCoursesIntoTour,
    computeTotalPar,
    deleteCustomCourse,
    loadCustomCourses,
    renameCustomCourse,
    updateCourseVisibility,
    updateHolePermissions,
  } from "$lib/engine/course/CourseStorage";
  import HoleMinimap from "./HoleMinimap.svelte";
  import { moveBundlerHole } from "./CourseHubHelpers";

  export let initialTab = "official"; // "official" | "mine"
  export let initialCustomCourses = null;
  export let manifest = null;

  let activeTab = initialTab;
  let officialCourses = [carnivalParkCourse];
  let customCourses = initialCustomCourses ?? [];

  let renamingCourseId = null;
  let renameDraft = "";

  // Tour Bundler state (in My Holes & Tours)
  let bundlerHoles = []; // Array<{ key, label, sourceCourseName, hole }>
  let tourNameDraft = "My Custom Carnival Tour";
  let tourThemeDraft = "carnival_park";
  let tourVisibilityDraft = "private";
  let bundlerFeedback = "";

  $: bundlerTotalPar = computeTotalPar(bundlerHoles.map((item) => item.hole));

  onMount(async () => {
    if (!initialCustomCourses) {
      customCourses = loadCustomCourses();
    }
    if (!manifest) {
      try {
        const res = await fetch("/models/kit/manifest.json");
        if (res.ok) manifest = await res.json();
      } catch {
        // Fallback minimap rendering handles null manifest cleanly
      }
    }
  });

  function refreshCustomCourses() {
    customCourses = loadCustomCourses();
  }

  function addHoleToBundler(hole, sourceCourseName) {
    bundlerHoles = [
      ...bundlerHoles,
      {
        key: `${Date.now()}_${Math.random()}`,
        label: hole.name || `Hole ${hole.holeNumber}`,
        sourceCourseName,
        hole: JSON.parse(JSON.stringify(hole)),
      },
    ];
    bundlerFeedback = `Added "${hole.name || `Hole ${hole.holeNumber}`}" to Tour Bundler`;
    setTimeout(() => (bundlerFeedback = ""), 2500);
  }

  function addAllHolesToBundler(course) {
    for (const h of course.holes) {
      addHoleToBundler(h, course.name);
    }
    activeTab = "mine";
  }

  function handleMoveBundler(index, delta) {
    bundlerHoles = moveBundlerHole(bundlerHoles, index, delta);
  }

  function handleRemoveBundler(index) {
    bundlerHoles = bundlerHoles.filter((_, i) => i !== index);
  }

  function handleSaveBundledTour() {
    if (bundlerHoles.length === 0) return;
    bundleCoursesIntoTour({
      name: tourNameDraft.trim() || "Custom Tour",
      theme: tourThemeDraft,
      holes: bundlerHoles.map((b) => b.hole),
      visibility: tourVisibilityDraft,
    });
    bundlerHoles = [];
    bundlerFeedback = "Saved Custom Tour!";
    setTimeout(() => (bundlerFeedback = ""), 2500);
    refreshCustomCourses();
  }

  function beginRename(course) {
    renamingCourseId = course.id;
    renameDraft = course.name;
  }

  function commitRename(courseId) {
    if (renameCustomCourse(courseId, renameDraft)) {
      refreshCustomCourses();
    }
    renamingCourseId = null;
  }

  function handleToggleCourseVisibility(course) {
    const next = course.visibility === "public" ? "private" : "public";
    if (updateCourseVisibility(course.id, next)) {
      refreshCustomCourses();
    }
  }

  function handleToggleHoleVisibility(courseId, holeIndex, hole) {
    const next = hole.visibility === "public" ? "private" : "public";
    if (updateHolePermissions(courseId, holeIndex, { visibility: next })) {
      refreshCustomCourses();
    }
  }

  function handleToggleHoleRemix(courseId, holeIndex, hole) {
    const next = hole.allowRemix === false;
    if (updateHolePermissions(courseId, holeIndex, { allowRemix: next })) {
      refreshCustomCourses();
    }
  }

  function handleDeleteCourse(course) {
    const ok = typeof window === "undefined" || window.confirm(`Delete "${course.name}"?`);
    if (!ok) return;
    if (deleteCustomCourse(course.id)) {
      refreshCustomCourses();
    }
  }
</script>

<div class="min-h-screen bg-slate-950 text-white font-sans">
  <!-- Top Header -->
  <header class="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-20">
    <div class="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <a
          href="/"
          class="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-gray-300"
        >
          ← Menu
        </a>
        <div>
          <h1 class="text-xl font-extrabold tracking-tight text-white">Courses &amp; Tours Hub</h1>
          <p class="text-xs text-gray-400">Play 9-hole Tours, inspect top-down layouts, remix holes, or bundle your own Tour.</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        {#if bundlerFeedback}
          <span class="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-mono font-bold">
            {bundlerFeedback}
          </span>
        {/if}
        <a
          href="/editor"
          class="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:brightness-110 text-black text-xs font-extrabold font-mono shadow-lg transition-all"
        >
          ✨ New Hole in Editor
        </a>
      </div>
    </div>

    <!-- Two Tabs Only: Official Tours & My Holes & Tours -->
    <div class="max-w-7xl mx-auto px-6 pb-3 flex items-center gap-2">
      <button
        on:click={() => (activeTab = "official")}
        class="px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all {activeTab === 'official' ? 'bg-amber-500 text-black shadow-lg' : 'bg-white/5 text-gray-300 hover:bg-white/10'}"
      >
        🎪 Official Tours ({officialCourses.length})
      </button>
      <button
        on:click={() => (activeTab = "mine")}
        class="px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all {activeTab === 'mine' ? 'bg-cyan-500 text-black shadow-lg' : 'bg-white/5 text-gray-300 hover:bg-white/10'}"
      >
        🛠️ My Holes &amp; Tours ({customCourses.length})
        {#if bundlerHoles.length > 0}
          <span class="ml-1.5 px-1.5 py-0.5 rounded-full bg-black/25 text-[10px]">
            Bundle: {bundlerHoles.length}
          </span>
        {/if}
      </button>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-6 py-8 space-y-8">
    {#if activeTab === "official"}
      {#each officialCourses as course (course.id)}
        <section class="bg-slate-900/70 border border-white/10 rounded-3xl p-6 space-y-6 shadow-2xl">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div class="flex items-center gap-2.5">
                <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[11px] font-mono font-bold uppercase">
                  Official {course.holes.length}-Hole Tour
                </span>
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 text-[11px] font-mono font-bold">
                  Par {computeTotalPar(course.holes)}
                </span>
              </div>
              <h2 class="text-2xl font-extrabold text-white mt-2">{course.name}</h2>
              <p class="text-xs text-gray-400 mt-1">
                Pick any hole to practice directly, open an editable Remix copy, or queue holes into your own Custom Tour.
              </p>
            </div>

            <div class="flex items-center gap-3">
              <a
                href="/play?course={course.id}"
                class="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm font-mono shadow-lg transition-all"
              >
                ▶️ Play {course.holes.length}-Hole Tour
              </a>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {#each course.holes as hole, idx (`${course.id}_${hole.holeNumber}`)}
              <article class="bg-slate-950/75 border border-white/10 rounded-2xl p-4 flex flex-col justify-between gap-3 hover:border-amber-400/40 transition-colors">
                <div class="space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <span class="text-[11px] font-mono font-bold text-amber-400 uppercase">
                        Hole {hole.holeNumber}
                      </span>
                      <h3 class="text-base font-bold text-white leading-tight">
                        {hole.name || `Hole ${hole.holeNumber}`}
                      </h3>
                    </div>
                    <span class="px-2 py-0.5 rounded-lg bg-white/10 text-xs font-mono font-bold text-cyan-300">
                      Par {hole.par}
                    </span>
                  </div>

                  <HoleMinimap {hole} {manifest} heightClass="h-32" />

                  <div class="flex items-center gap-3 text-[11px] font-mono text-gray-400">
                    <span>🧩 {hole.tiles.length} tiles</span>
                    <span>🎯 {hole.props.length} props</span>
                  </div>
                </div>

                <div class="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10 text-xs font-mono font-bold">
                  <a
                    href="/play?course={course.id}&hole={hole.holeNumber}"
                    class="text-center py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white transition-colors"
                  >
                    ▶️ Play
                  </a>
                  <a
                    href="/editor?courseId={course.id}&hole={hole.holeNumber}"
                    class="text-center py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/30 text-amber-200 transition-colors"
                  >
                    ✏️ Edit Remix
                  </a>
                  <button
                    on:click={() => addHoleToBundler(hole, course.name)}
                    class="py-2 rounded-xl bg-white/5 hover:bg-cyan-500/25 border border-white/10 hover:border-cyan-400/35 text-cyan-200 transition-colors"
                    title="Add this hole to the Tour Bundler"
                  >
                    + Bundle
                  </button>
                </div>
              </article>
            {/each}
          </div>
        </section>
      {/each}
    {:else}
      <!-- My Holes & Tours Tab -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div class="lg:col-span-2 space-y-5">
          {#if customCourses.length === 0}
            <div class="bg-slate-900/70 border border-dashed border-white/15 rounded-3xl p-10 text-center space-y-4">
              <p class="text-lg font-bold text-white">No saved custom holes or tours yet</p>
              <p class="text-xs text-gray-400 max-w-md mx-auto">
                Build a fresh hole in the Track Editor, remix any hole from Official Tours, or combine favorite holes in the Tour Bundler.
              </p>
              <div class="flex justify-center gap-3 pt-2">
                <a
                  href="/editor"
                  class="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-extrabold"
                >
                  ✨ Create New Hole
                </a>
                <button
                  on:click={() => (activeTab = "official")}
                  class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono font-bold"
                >
                  🎪 Browse Official Holes
                </button>
              </div>
            </div>
          {:else}
            {#each customCourses as course (course.id)}
              {@const isPublicCourse = course.visibility === "public"}
              <section class="bg-slate-900/75 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div class="space-y-1">
                    {#if renamingCourseId === course.id}
                      <div class="flex items-center gap-2">
                        <input
                          bind:value={renameDraft}
                          class="bg-black/50 border border-cyan-400/50 rounded-lg px-2.5 py-1 text-sm font-bold text-white focus:outline-none"
                        />
                        <button
                          on:click={() => commitRename(course.id)}
                          class="px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-xs font-mono font-bold"
                        >
                          Save
                        </button>
                        <button
                          on:click={() => (renamingCourseId = null)}
                          class="px-2 py-1 rounded-lg bg-white/10 text-gray-300 text-xs font-mono"
                        >
                          Cancel
                        </button>
                      </div>
                    {:else}
                      <div class="flex items-center gap-2 flex-wrap">
                        <h3 class="text-lg font-extrabold text-white">{course.name}</h3>
                        <span class="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono font-bold text-cyan-300">
                          {course.holes.length} {course.holes.length === 1 ? "Hole" : "Holes"} &bull; Par {computeTotalPar(course.holes)}
                        </span>
                      </div>
                    {/if}
                  </div>

                  <div class="flex flex-wrap items-center gap-1.5 text-xs font-mono font-bold">
                    <button
                      on:click={() => handleToggleCourseVisibility(course)}
                      class="px-2.5 py-1.5 rounded-xl border transition-colors {isPublicCourse
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                        : 'bg-white/5 border-white/15 text-gray-300'}"
                      title="Toggle Tour visibility (Private or Public for community play)"
                    >
                      {isPublicCourse ? "🌐 Public" : "🔒 Private"}
                    </button>
                    <a
                      href="/play?course={course.id}"
                      class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      ▶️ Play
                    </a>
                    <button
                      on:click={() => addAllHolesToBundler(course)}
                      class="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-200"
                    >
                      + Tour
                    </button>
                    <button
                      on:click={() => beginRename(course)}
                      class="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-200"
                    >
                      🏷️ Rename
                    </button>
                    <button
                      on:click={() => handleDeleteCourse(course)}
                      class="px-2.5 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-300"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {#each course.holes as hole, idx (`${course.id}_h_${idx}`)}
                    {@const isHolePublic = hole.visibility === "public"}
                    {@const isRemixable = hole.allowRemix !== false}
                    <article class="bg-slate-950/75 border border-white/10 rounded-2xl p-3 space-y-2.5">
                      <div class="flex items-center justify-between gap-2">
                        <div>
                          <span class="text-[10px] font-mono font-bold text-cyan-400 uppercase">Hole {idx + 1}</span>
                          <div class="text-sm font-bold text-white">{hole.name || `Hole ${idx + 1}`}</div>
                        </div>
                        <span class="text-xs font-mono font-bold text-amber-300">Par {hole.par}</span>
                      </div>

                      <HoleMinimap {hole} {manifest} heightClass="h-24" />

                      <!-- Per-Hole Sharing Controls -->
                      <div class="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <button
                          on:click={() => handleToggleHoleVisibility(course.id, idx, hole)}
                          class="px-2 py-1 rounded-lg border {isHolePublic
                            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-gray-400'}"
                        >
                          {isHolePublic ? "🌐 Public" : "🔒 Private"}
                        </button>
                        <label class="flex items-center gap-1.5 text-gray-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isRemixable}
                            on:change={() => handleToggleHoleRemix(course.id, idx, hole)}
                            class="accent-cyan-400"
                          />
                          <span>🔁 Remixable</span>
                        </label>
                      </div>

                      <div class="grid grid-cols-2 gap-1.5 pt-1 text-xs font-mono font-bold">
                        <a
                          href="/play?course={course.id}&hole={idx + 1}"
                          class="text-center py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 text-white"
                        >
                          ▶️ Play
                        </a>
                        <a
                          href="/editor?courseId={course.id}&hole={idx + 1}"
                          class="text-center py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/30 text-amber-200"
                        >
                          ✏️ Edit Hole
                        </a>
                      </div>
                    </article>
                  {/each}
                </div>
              </section>
            {/each}
          {/if}
        </div>

        <!-- Right Panel: Tour Bundler -->
        <aside class="bg-slate-900/85 border border-cyan-400/25 rounded-3xl p-5 space-y-4 sticky top-36 shadow-2xl">
          <div>
            <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300">
              Custom Multi-Hole Builder
            </span>
            <h3 class="text-lg font-extrabold text-white">Tour Bundler</h3>
            <p class="text-xs text-gray-400 mt-0.5">
              Combine official or custom holes into your own multi-hole Tour.
            </p>
          </div>

          <div class="space-y-2 text-xs font-mono">
            <label class="block space-y-1">
              <span class="text-gray-400">Tour Name</span>
              <input
                bind:value={tourNameDraft}
                class="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-400"
                placeholder="My Carnival Showcase"
              />
            </label>

            <div class="grid grid-cols-2 gap-2">
              <label class="block space-y-1">
                <span class="text-gray-400">Theme</span>
                <select
                  bind:value={tourThemeDraft}
                  class="w-full bg-black/40 border border-white/15 rounded-xl px-2.5 py-2 text-white font-bold"
                >
                  <option value="carnival_park">🎪 Carnival</option>
                  <option value="country_club">🏌️ Classic</option>
                </select>
              </label>

              <label class="block space-y-1">
                <span class="text-gray-400">Visibility</span>
                <select
                  bind:value={tourVisibilityDraft}
                  class="w-full bg-black/40 border border-white/15 rounded-xl px-2.5 py-2 text-white font-bold"
                >
                  <option value="private">🔒 Private</option>
                  <option value="public">🌐 Public</option>
                </select>
              </label>
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-gray-300 font-bold">Queued Holes ({bundlerHoles.length})</span>
              <span class="text-amber-300 font-bold">Total Par {bundlerTotalPar}</span>
            </div>

            {#if bundlerHoles.length === 0}
              <div class="border border-dashed border-white/15 rounded-2xl p-4 text-center text-xs text-gray-400">
                Click <span class="text-cyan-300 font-bold">+ Bundle</span> on any Official hole or <span class="text-cyan-300 font-bold">+ Tour</span> on a custom hole to add it here.
              </div>
            {:else}
              <div class="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {#each bundlerHoles as item, i (item.key)}
                  <div class="flex items-center justify-between gap-2 bg-black/35 border border-white/10 rounded-xl px-2.5 py-2 text-xs">
                    <div class="min-w-0">
                      <div class="font-bold text-white truncate">#{i + 1} {item.label}</div>
                      <div class="text-[10px] text-gray-400 truncate">Par {item.hole.par} &bull; {item.sourceCourseName}</div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0 font-mono">
                      <button
                        on:click={() => handleMoveBundler(i, -1)}
                        disabled={i === 0}
                        class="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 disabled:opacity-30"
                        title="Move Up"
                      >
                        ↑
                      </button>
                      <button
                        on:click={() => handleMoveBundler(i, 1)}
                        disabled={i === bundlerHoles.length - 1}
                        class="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 disabled:opacity-30"
                        title="Move Down"
                      >
                        ↓
                      </button>
                      <button
                        on:click={() => handleRemoveBundler(i)}
                        class="px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/35 text-red-300"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                {/each}
              </div>

              <button
                on:click={handleSaveBundledTour}
                class="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:brightness-110 text-black font-extrabold text-xs font-mono shadow-lg transition-all"
              >
                🏆 Save Custom Tour ({bundlerHoles.length} {bundlerHoles.length === 1 ? "Hole" : "Holes"})
              </button>
            {/if}
          </div>
        </aside>
      </div>
    {/if}
  </main>
</div>
