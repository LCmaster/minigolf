<script>
  import { onMount, onDestroy } from "svelte";
  import { GameEngine } from "$lib/engine/GameEngine";
  import { countryClub9Hole } from "$lib/courses/countryClub9Hole";

  let canvas;
  let engine;

  let currentHoleIndex = 0;
  let currentHole = countryClub9Hole.holes[0];
  let strokes = 0;
  let totalScore = 0;
  let scoreCard = [];

  let isReady = false;
  let currentFps = 60;
  let isCupSunk = false;
  let isCourseFinished = false;
  let isMuted = false;

  onMount(async () => {
    if (!canvas) return;

    engine = new GameEngine(canvas);
    await engine.init();

    engine.on("fpsUpdate", (fps) => {
      currentFps = fps;
    });

    engine.on("strokeTaken", (ev) => {
      strokes = ev.strokeNumber;
    });

    engine.on("cupSink", () => {
      isCupSunk = true;
      const relative = strokes - currentHole.par;
      totalScore += relative;
      scoreCard.push({
        hole: currentHole.holeNumber,
        par: currentHole.par,
        strokes,
        relative,
      });
      scoreCard = scoreCard;
    });

    loadHole(0);
    engine.start();
    isReady = true;
  });

  function loadHole(index) {
    if (index >= countryClub9Hole.holes.length) {
      isCourseFinished = true;
      return;
    }

    currentHoleIndex = index;
    currentHole = countryClub9Hole.holes[index];
    strokes = 0;
    isCupSunk = false;

    engine.courseManager.loadHole(currentHole);
    engine.ballController.createPhysicsBody(engine.courseManager.spawnPosition);
    engine.cameraController.setTarget(engine.courseManager.spawnPosition);
  }

  function nextHole() {
    loadHole(currentHoleIndex + 1);
  }

  function restartCourse() {
    scoreCard = [];
    totalScore = 0;
    isCourseFinished = false;
    loadHole(0);
  }

  function toggleAudio() {
    if (!engine) return;
    isMuted = engine.audio.toggleMute();
  }

  function respawnBall() {
    if (!engine) return;
    engine.ballController.respawn();
  }

  onDestroy(() => {
    engine?.dispose();
  });
</script>

<svelte:head>
  <title>Play Campaign | Mini Golf Mania</title>
</svelte:head>

<div class="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
  <canvas bind:this={canvas} class="w-full h-full block cursor-crosshair"></canvas>

  <!-- Top-Left Hole & Score HUD -->
  <div class="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-3xl text-white font-mono shadow-2xl space-y-2 min-w-[200px]">
    <div class="flex items-center justify-between pb-2 border-b border-white/10">
      <span class="text-xs font-bold text-gray-400">HOLE {currentHole.holeNumber} OF 9</span>
      <span class="text-xs text-emerald-400 font-bold">{currentFps} FPS</span>
    </div>

    <div class="grid grid-cols-2 gap-3 text-center pt-1">
      <div class="bg-black/30 p-2 rounded-2xl border border-white/5">
        <div class="text-[10px] text-gray-400">PAR</div>
        <div class="text-2xl font-extrabold text-cyan-400">{currentHole.par}</div>
      </div>
      <div class="bg-black/30 p-2 rounded-2xl border border-white/5">
        <div class="text-[10px] text-gray-400">STROKES</div>
        <div class="text-2xl font-extrabold text-amber-400">{strokes}</div>
      </div>
    </div>

    <div class="pt-1 flex justify-between text-xs text-gray-400 border-t border-white/10">
      <span>Total Relative:</span>
      <span class="font-bold {totalScore < 0 ? 'text-emerald-400' : (totalScore > 0 ? 'text-red-400' : 'text-gray-200')}">
        {totalScore === 0 ? 'E' : (totalScore > 0 ? `+${totalScore}` : totalScore)}
      </span>
    </div>
  </div>

  <!-- Top-Right Controls -->
  <div class="absolute top-4 right-4 flex items-center gap-2">
    <button
      on:click={toggleAudio}
      class="bg-slate-900/90 backdrop-blur-xl border border-white/10 w-11 h-11 rounded-2xl flex items-center justify-center text-lg hover:bg-white/10 transition-colors shadow-2xl text-white"
      title="Toggle Audio"
    >
      {isMuted ? '🔇' : '🔊'}
    </button>
    <button
      on:click={respawnBall}
      class="bg-slate-900/90 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold text-gray-300 hover:text-white transition-colors shadow-2xl"
    >
      Respawn Ball
    </button>
    <a
      href="/"
      class="bg-slate-900/90 backdrop-blur-xl border border-white/10 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold text-gray-300 hover:text-white transition-colors shadow-2xl"
    >
      Menu
    </a>
  </div>

  <!-- Hole Complete Modal -->
  {#if isCupSunk && !isCourseFinished}
    <div class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div class="bg-slate-900 border border-emerald-500/50 p-8 rounded-3xl text-center shadow-2xl space-y-4 max-w-sm w-full animate-in zoom-in-95 duration-200 text-white font-mono">
        <div class="text-5xl">⛳ 🎉</div>
        <div class="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 font-sans">
          HOLE {currentHole.holeNumber} SINK!
        </div>
        <div class="text-base text-gray-300">
          Strokes: <span class="font-bold text-amber-400">{strokes}</span> (Par {currentHole.par})
          <div class="text-xs pt-1">
            {#if strokes === 1}
              <span class="text-emerald-400 font-bold text-sm">🌟 HOLE IN ONE!</span>
            {:else if strokes < currentHole.par}
              <span class="text-emerald-400 font-bold text-sm">✨ BIRDIE!</span>
            {:else if strokes === currentHole.par}
              <span class="text-cyan-400 font-bold text-sm">👍 PAR</span>
            {:else}
              <span class="text-amber-400 font-bold text-sm">BOGEY</span>
            {/if}
          </div>
        </div>

        <button
          on:click={nextHole}
          class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl text-sm transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
        >
          <span>Next Hole</span>
          <span>➡️</span>
        </button>
      </div>
    </div>
  {/if}

  <!-- Championship Finished Modal -->
  {#if isCourseFinished}
    <div class="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-50 p-4">
      <div class="bg-slate-900 border border-amber-400/50 p-8 rounded-3xl text-center shadow-2xl space-y-6 max-w-lg w-full text-white font-mono animate-in zoom-in-95">
        <div class="text-5xl">🏆 ⛳</div>
        <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-sans">
          CHAMPIONSHIP COMPLETED!
        </h2>

        <!-- Scorecard Table -->
        <div class="bg-black/40 rounded-2xl border border-white/10 overflow-hidden text-xs">
          <div class="grid grid-cols-4 p-2.5 bg-white/5 font-bold text-gray-400 border-b border-white/10">
            <span>HOLE</span>
            <span>PAR</span>
            <span>STROKES</span>
            <span>+/-</span>
          </div>
          {#each scoreCard as s}
            <div class="grid grid-cols-4 p-2 border-b border-white/5 text-gray-300">
              <span>{s.hole}</span>
              <span>{s.par}</span>
              <span class="font-bold text-white">{s.strokes}</span>
              <span class="{s.relative < 0 ? 'text-emerald-400' : (s.relative > 0 ? 'text-red-400' : 'text-gray-400')} font-bold">
                {s.relative === 0 ? 'E' : (s.relative > 0 ? `+${s.relative}` : s.relative)}
              </span>
            </div>
          {/each}
          <div class="grid grid-cols-4 p-2.5 bg-white/10 font-bold text-white">
            <span>TOTAL</span>
            <span>30</span>
            <span class="text-amber-400">{scoreCard.reduce((acc, curr) => acc + curr.strokes, 0)}</span>
            <span class="{totalScore < 0 ? 'text-emerald-400' : 'text-amber-400'}">
              {totalScore === 0 ? 'E' : (totalScore > 0 ? `+${totalScore}` : totalScore)}
            </span>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            on:click={restartCourse}
            class="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-2xl text-xs transition-colors"
          >
            Play Again
          </button>
          <a
            href="/editor"
            class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-2xl text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            Open Track Editor
          </a>
        </div>
      </div>
    </div>
  {/if}
</div>

