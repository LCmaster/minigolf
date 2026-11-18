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
  import TourBundlerPanel from "./TourBundlerPanel.svelte";
  import { moveBundlerHole } from "./CourseHubHelpers";
  import ArcadeButton from "$lib/components/ui/ArcadeButton.svelte";

  export let initialTab = "official"; // "official" | "mine"
  export let initialCustomCourses = null;
  export let manifest = null;

  let activeTab = initialTab;
  let officialCourses = [carnivalParkCourse];
  let customCourses = initialCustomCourses ?? [];

  let renamingCourseId = null;
  let renameDraft = "";

  // Tour Bundler state (in My Holes & Tours)
  let bundlerHoles = [];
  let tourNameDraft = "My Custom Carnival Tour";
  let tourThemeDraft = "carnival_park";
  let tourVisibilityDraft = "private";
  let bundlerFeedback = "";

  $: bundlerTotalPar = computeTotalPar(bundlerHoles.map((item) => item.hole));

  onMount(async () => {
    if (!initialCustomCourses) customCourses = loadCustomCourses();
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
    for (const h of course.holes) addHoleToBundler(h, course.name);
    activeTab = "mine";
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
    if (renameCustomCourse(courseId, renameDraft)) refreshCustomCourses();
    renamingCourseId = null;
  }

  function handleToggleCourseVisibility(course) {
    const next = course.visibility === "public" ? "private" : "public";
    if (updateCourseVisibility(course.id, next)) refreshCustomCourses();
  }

  function handleToggleHoleVisibility(courseId, holeIndex, hole) {
    const next = hole.visibility === "public" ? "private" : "public";
    if (updateHolePermissions(courseId, holeIndex, { visibility: next })) refreshCustomCourses();
  }

  function handleToggleHoleRemix(courseId, holeIndex, hole) {
    const next = hole.allowRemix === false;
    if (updateHolePermissions(courseId, holeIndex, { allowRemix: next })) refreshCustomCourses();
  }

  function handleDeleteCourse(course) {
    const ok = typeof window === "undefined" || window.confirm(`Delete "${course.name}"?`);
    if (ok && deleteCustomCourse(course.id)) refreshCustomCourses();
  }
</script>

<div class="relative min-h-screen bg-sky-400 text-slate-900 font-sans">
  <!-- Blurred Course Artwork Backdrop -->
  <div class="fixed inset-0 pointer-events-none">
    <img
      src="/courses/carnival-park-card.png"
      alt=""
      aria-hidden="true"
      class="w-full h-full object-cover blur-[8px] scale-105 brightness-75"
    />
    <div class="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-900/20 to-[#2a1205]/70"></div>
  </div>

  <!-- Cartoon Wood Arcade Top Header -->
  <header class="sticky top-0 z-20 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 border-b-4 border-[#431407] shadow-[0_6px_0_#2a1205,0_12px_24px_rgba(0,0,0,0.45)] text-white">
    <div class="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <ArcadeButton href="/" variant="cream" size="sm">← Menu</ArcadeButton>
        <div>
          <h1 class="text-xl md:text-2xl font-black tracking-tight text-amber-100 drop-shadow-[0_2px_0_#431407]">
            Courses &amp; Tours Hub
          </h1>
          <p class="text-xs font-bold text-amber-200/85">
            Play 9-hole Tours, inspect top-down layouts, remix holes, or bundle your own Tour.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        {#if bundlerFeedback}
          <span class="px-3 py-1.5 rounded-full bg-emerald-500 border-2 border-white text-white text-xs font-black shadow">
            {bundlerFeedback}
          </span>
        {/if}
        <ArcadeButton href="/editor" variant="amber" size="md">✨ New Hole in Editor</ArcadeButton>
      </div>
    </div>

    <!-- Official vs My Holes & Tours Tabs -->
    <div class="max-w-7xl mx-auto px-6 pb-3 flex items-center gap-2.5">
      <button
        on:click={() => (activeTab = "official")}
        class="px-4 py-2 rounded-full text-xs font-black border-2 transition-all cursor-pointer {activeTab === 'official' ? 'bg-gradient-to-b from-amber-300 to-orange-500 border-white text-[#431407] shadow-[0_3px_0_#431407]' : 'bg-black/30 border-amber-300/30 text-amber-100 hover:bg-black/45'}"
      >
        🎪 Official Tours ({officialCourses.length})
      </button>
      <button
        on:click={() => (activeTab = "mine")}
        class="px-4 py-2 rounded-full text-xs font-black border-2 transition-all cursor-pointer {activeTab === 'mine' ? 'bg-gradient-to-b from-sky-400 to-blue-600 border-white text-white shadow-[0_3px_0_#1e3a8a]' : 'bg-black/30 border-amber-300/30 text-amber-100 hover:bg-black/45'}"
      >
        🛠️ My Holes &amp; Tours ({customCourses.length})
        {#if bundlerHoles.length > 0}
          <span class="ml-1.5 px-1.5 py-0.5 rounded-full bg-black/30 text-[10px]">
            Bundle: {bundlerHoles.length}
          </span>
        {/if}
      </button>
    </div>
  </header>

  <main class="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
    {#if activeTab === "official"}
      {#each officialCourses as course (course.id)}
        <section class="rounded-[2rem] p-[4px] bg-[#2a1205] shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
          <div class="rounded-[1.8rem] bg-amber-50/95 border-[3px] border-[#431407] p-6 space-y-6">
            <div class="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#431407]/15 pb-5">
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 rounded-full bg-amber-300 border-2 border-[#431407] text-[#431407] text-[11px] font-black uppercase">
                    Official {course.holes.length}-Hole Tour
                  </span>
                  <span class="px-2.5 py-0.5 rounded-full bg-emerald-500 border-2 border-[#14532d] text-white text-[11px] font-black">
                    Par {computeTotalPar(course.holes)}
                  </span>
                </div>
                <h2 class="text-2xl md:text-3xl font-black text-[#431407] mt-2">{course.name}</h2>
                <p class="text-xs font-bold text-[#431407]/75 mt-1">
                  Pick any hole to practice directly, open an editable Remix copy, or queue holes into your own Custom Tour.
                </p>
              </div>

              <ArcadeButton href="/play?course={course.id}" variant="green" size="lg">
                ▶️ Play {course.holes.length}-Hole Tour
              </ArcadeButton>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {#each course.holes as hole (`${course.id}_${hole.holeNumber}`)}
                <article class="rounded-2xl bg-white border-[3px] border-[#431407] p-4 shadow-[0_4px_0_#431407] flex flex-col justify-between gap-3">
                  <div class="space-y-3">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        <span class="text-[11px] font-black text-amber-700 uppercase">Hole {hole.holeNumber}</span>
                        <h3 class="text-base font-black text-[#431407] leading-tight">
                          {hole.name || `Hole ${hole.holeNumber}`}
                        </h3>
                      </div>
                      <span class="px-2.5 py-0.5 rounded-full bg-sky-500 border border-[#1e3a8a] text-xs font-black text-white shrink-0">
                        Par {hole.par}
                      </span>
                    </div>

                    <HoleMinimap {hole} {manifest} heightClass="h-32" />

                    <div class="flex items-center gap-3 text-[11px] font-extrabold text-[#431407]/75">
                      <span>🧩 {hole.tiles.length} tiles</span>
                      <span>🎯 {hole.props.length} props</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-3 gap-1.5 pt-2 border-t-2 border-[#431407]/15 text-xs font-black">
                    <a
                      href="/play?course={course.id}&hole={hole.holeNumber}"
                      class="text-center py-2 rounded-xl bg-gradient-to-b from-lime-400 to-emerald-600 border-2 border-[#14532d] text-white shadow-[0_2px_0_#14532d] hover:brightness-110 transition-all"
                    >
                      ▶️ Play
                    </a>
                    <a
                      href="/editor?courseId={course.id}&hole={hole.holeNumber}"
                      class="text-center py-2 rounded-xl bg-gradient-to-b from-amber-300 to-orange-500 border-2 border-[#78350f] text-[#431407] shadow-[0_2px_0_#78350f] hover:brightness-110 transition-all"
                    >
                      ✏️ Edit Remix
                    </a>
                    <button
                      on:click={() => addHoleToBundler(hole, course.name)}
                      class="py-2 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-[#1e3a8a] text-white shadow-[0_2px_0_#1e3a8a] hover:brightness-110 transition-all cursor-pointer"
                      title="Add this hole to the Tour Bundler"
                    >
                      + Bundle
                    </button>
                  </div>
                </article>
              {/each}
            </div>
          </div>
        </section>
      {/each}
    {:else}
      <!-- My Holes & Tours Tab -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div class="lg:col-span-2 space-y-5">
          {#if customCourses.length === 0}
            <div class="rounded-3xl bg-amber-50/95 border-[3px] border-[#431407] p-10 text-center space-y-4 shadow-[0_6px_0_#431407]">
              <p class="text-lg font-black text-[#431407]">No saved custom holes or tours yet</p>
              <p class="text-xs font-bold text-[#431407]/75 max-w-md mx-auto">
                Build a fresh hole in the Track Editor, remix any hole from Official Tours, or combine favorite holes in the Tour Bundler.
              </p>
              <div class="flex justify-center gap-3 pt-2">
                <ArcadeButton href="/editor" variant="amber" size="md">✨ Create New Hole</ArcadeButton>
                <ArcadeButton variant="green" size="md" on:click={() => (activeTab = "official")}>
                  🎪 Browse Official Holes
                </ArcadeButton>
              </div>
            </div>
          {:else}
            {#each customCourses as course (course.id)}
              {@const isPublicCourse = course.visibility === "public"}
              <section class="rounded-3xl p-[3px] bg-[#2a1205] shadow-[0_6px_0_#2a1205,0_14px_28px_rgba(0,0,0,0.4)]">
                <div class="rounded-[1.35rem] bg-amber-50/95 border-[3px] border-[#431407] p-5 space-y-4">
                  <div class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#431407]/15 pb-4">
                    <div class="space-y-1">
                      {#if renamingCourseId === course.id}
                        <div class="flex items-center gap-2">
                          <input
                            bind:value={renameDraft}
                            class="bg-white border-2 border-[#431407]/40 rounded-xl px-2.5 py-1 text-sm font-bold text-slate-900 focus:outline-none"
                          />
                          <ArcadeButton variant="green" size="sm" on:click={() => commitRename(course.id)}>
                            Save
                          </ArcadeButton>
                          <ArcadeButton variant="cream" size="sm" on:click={() => (renamingCourseId = null)}>
                            Cancel
                          </ArcadeButton>
                        </div>
                      {:else}
                        <div class="flex items-center gap-2 flex-wrap">
                          <h3 class="text-lg font-black text-[#431407]">{course.name}</h3>
                          <span class="px-2.5 py-0.5 rounded-full bg-amber-200 border border-[#431407]/30 text-[10px] font-black text-[#431407]">
                            {course.holes.length} {course.holes.length === 1 ? "Hole" : "Holes"} &bull; Par {computeTotalPar(course.holes)}
                          </span>
                        </div>
                      {/if}
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5 text-xs font-black">
                      <button
                        on:click={() => handleToggleCourseVisibility(course)}
                        class="px-2.5 py-1.5 rounded-xl border-2 cursor-pointer transition-colors {isPublicCourse ? 'bg-emerald-100 border-emerald-600 text-emerald-900' : 'bg-white border-[#431407]/30 text-[#431407]'}"
                        title="Toggle Tour visibility (Private or Public for community play)"
                      >
                        {isPublicCourse ? "🌐 Public" : "🔒 Private"}
                      </button>
                      <ArcadeButton href="/play?course={course.id}" variant="green" size="sm">▶️ Play</ArcadeButton>
                      <ArcadeButton variant="blue" size="sm" on:click={() => addAllHolesToBundler(course)}>+ Tour</ArcadeButton>
                      <ArcadeButton variant="cream" size="sm" on:click={() => beginRename(course)}>🏷️ Rename</ArcadeButton>
                      <ArcadeButton variant="red" size="sm" on:click={() => handleDeleteCourse(course)}>🗑️</ArcadeButton>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {#each course.holes as hole, idx (`${course.id}_h_${idx}`)}
                      {@const isHolePublic = hole.visibility === "public"}
                      {@const isRemixable = hole.allowRemix !== false}
                      <article class="rounded-2xl bg-white border-[2.5px] border-[#431407] p-3 shadow-[0_3px_0_#431407] space-y-2.5">
                        <div class="flex items-center justify-between gap-2">
                          <div>
                            <span class="text-[10px] font-black text-amber-700 uppercase">Hole {idx + 1}</span>
                            <div class="text-sm font-black text-[#431407]">{hole.name || `Hole ${idx + 1}`}</div>
                          </div>
                          <span class="px-2 py-0.5 rounded-full bg-sky-500 text-white text-xs font-black">Par {hole.par}</span>
                        </div>

                        <HoleMinimap {hole} {manifest} heightClass="h-24" />

                        <div class="flex items-center justify-between gap-2 text-[11px] font-bold">
                          <button
                            on:click={() => handleToggleHoleVisibility(course.id, idx, hole)}
                            class="px-2 py-1 rounded-lg border cursor-pointer {isHolePublic ? 'bg-emerald-100 border-emerald-600 text-emerald-900' : 'bg-amber-50 border-[#431407]/30 text-[#431407]'}"
                          >
                            {isHolePublic ? "🌐 Public" : "🔒 Private"}
                          </button>
                          <label class="flex items-center gap-1.5 text-[#431407] cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isRemixable}
                              on:change={() => handleToggleHoleRemix(course.id, idx, hole)}
                              class="accent-amber-600"
                            />
                            <span>🔁 Remixable</span>
                          </label>
                        </div>

                        <div class="grid grid-cols-2 gap-1.5 pt-1 text-xs font-black">
                          <ArcadeButton href="/play?course={course.id}&hole={idx + 1}" variant="green" size="sm">▶️ Play</ArcadeButton>
                          <ArcadeButton href="/editor?courseId={course.id}&hole={idx + 1}" variant="amber" size="sm">✏️ Edit Hole</ArcadeButton>
                        </div>
                      </article>
                    {/each}
                  </div>
                </div>
              </section>
            {/each}
          {/if}
        </div>

        <TourBundlerPanel
          {bundlerHoles}
          bind:tourNameDraft
          bind:tourThemeDraft
          bind:tourVisibilityDraft
          {bundlerTotalPar}
          on:move={(e) => (bundlerHoles = moveBundlerHole(bundlerHoles, e.detail.index, e.detail.delta))}
          on:remove={(e) => (bundlerHoles = bundlerHoles.filter((_, i) => i !== e.detail))}
          on:save={handleSaveBundledTour}
        />
      </div>
    {/if}
  </main>
</div>
