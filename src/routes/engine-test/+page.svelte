<script>
  import { onMount, onDestroy } from "svelte";
  import { GameEngine } from "$lib/engine/GameEngine";

  let canvas;
  let engine;
  let currentFps = 60;
  let isReady = false;

  let strokes = 0;
  let isCupSunk = false;
  let wallLeftState = true;
  let wallRightState = true;

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
    });

    // Load full 3-tile playable course: Tee -> Straight -> Cup
    engine.loadTestHole();
    engine.start();
    // Expose engine instance on window for testing and diagnostics
    if (typeof window !== "undefined") {
      window.__engine = engine;
    }
    isReady = true;
  });

  function toggleStraightLeftWall() {
    if (!engine) return;
    wallLeftState = engine.courseManager.toggleWall("tile_straight", "left");
  }

  function toggleStraightRightWall() {
    if (!engine) return;
    wallRightState = engine.courseManager.toggleWall("tile_straight", "right");
  }

  function resetBall() {
    if (!engine) return;
    engine.ballController.respawn();
    isCupSunk = false;
  }

  onDestroy(() => {
    if (engine) {
      engine.dispose();
    }
  });
</script>

<svelte:head>
  <title>Engine Playtest | Mini Golf Mania</title>
</svelte:head>

<div class="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
  <canvas bind:this={canvas} class="w-full h-full block cursor-crosshair"></canvas>

  <!-- Top-Left Performance & State HUD -->
  <div class="absolute top-4 left-4 bg-slate-900/85 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-white font-mono shadow-2xl space-y-2 max-w-sm">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="w-3 h-3 rounded-full {isReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
        <span class="font-bold text-sm tracking-wide">Next-Gen Engine (M3)</span>
      </div>
      <span class="font-bold text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
        {currentFps} FPS
      </span>
    </div>
    <div class="text-xs text-gray-400">
      Blender MCP Modular Kit &bull; SeamWelder &bull; Pure Three.js + Rapier
    </div>

    <!-- Gameplay Stats -->
    <div class="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-center">
      <div class="bg-black/30 p-2 rounded-xl border border-white/5">
        <div class="text-xs text-gray-400">HOLE</div>
        <div class="text-xl font-bold text-white">1</div>
      </div>
      <div class="bg-black/30 p-2 rounded-xl border border-white/5">
        <div class="text-xs text-gray-400">STROKES</div>
        <div class="text-xl font-bold text-amber-400">{strokes}</div>
      </div>
    </div>

    <!-- Controls Guide -->
    <div class="text-xs text-gray-400 pt-1 space-y-1">
      <div>&bull; <strong class="text-white">Left Click &amp; Drag Ball:</strong> Direct slingshot aim &amp; power</div>
      <div>&bull; <strong class="text-white">Right Click &amp; Drag:</strong> Orbit camera</div>
      <div>&bull; <strong class="text-white">Power &gt; 75%:</strong> Jitter/shake volatility</div>
    </div>
  </div>

  <!-- Top-Right Dynamic Wall Toggles -->
  <div class="absolute top-4 right-4 bg-slate-900/85 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-white font-mono shadow-2xl space-y-2">
    <div class="text-xs font-bold text-gray-400 uppercase tracking-wider">Dynamic Wall Toggles</div>
    <div class="flex gap-2">
      <button
        on:click={toggleStraightLeftWall}
        class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors {wallLeftState ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-red-950/60 border-red-500/40 text-red-300'}"
      >
        Left Rail: {wallLeftState ? 'ON' : 'OFF'}
      </button>
      <button
        on:click={toggleStraightRightWall}
        class="px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors {wallRightState ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-red-950/60 border-red-500/40 text-red-300'}"
      >
        Right Rail: {wallRightState ? 'ON' : 'OFF'}
      </button>
    </div>
    <button
      on:click={resetBall}
      class="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-1.5 rounded-xl border border-white/10 transition-colors"
    >
      Respawn Ball
    </button>
  </div>

  <!-- Celebratory Cup Sink Banner -->
  {#if isCupSunk}
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="bg-black/90 backdrop-blur-xl border border-emerald-500/50 p-8 rounded-3xl text-center shadow-2xl pointer-events-auto space-y-4">
        <div class="text-5xl">⛳ 🎉</div>
        <div class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 font-sans">
          HOLE COMPLETED!
        </div>
        <div class="text-lg text-white font-mono">
          Total Strokes: <span class="font-bold text-amber-400">{strokes}</span>
          {#if strokes === 1}
            <span class="text-emerald-400 font-bold ml-2">(HOLE IN ONE!)</span>
          {:else if strokes === 2}
            <span class="text-cyan-400 font-bold ml-2">(PAR!)</span>
          {/if}
        </div>
        <button
          on:click={resetBall}
          class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-2xl shadow-lg transition-transform active:scale-95"
        >
          Play Again
        </button>
      </div>
    </div>
  {/if}
</div>
