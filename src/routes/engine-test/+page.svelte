<script>
  import { onMount, onDestroy } from "svelte";
  import { GameEngine } from "$lib/engine/GameEngine";

  let canvas;
  let engine;
  let currentFps = 60;
  let isReady = false;

  onMount(async () => {
    if (!canvas) return;

    engine = new GameEngine(canvas);
    await engine.init();

    engine.on("fpsUpdate", (fps) => {
      currentFps = fps;
    });

    // Spawn test ground and bouncing physics sphere
    engine.spawnHarnessTestObjects();
    engine.start();
    isReady = true;
  });

  onDestroy(() => {
    if (engine) {
      engine.dispose();
    }
  });
</script>

<svelte:head>
  <title>Engine Harness Test | Mini Golf Mania</title>
</svelte:head>

<div class="relative w-screen h-screen overflow-hidden bg-slate-900 select-none">
  <canvas bind:this={canvas} class="w-full h-full block"></canvas>

  <!-- HUD Overlay -->
  <div class="absolute top-4 left-4 bg-black/75 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white font-mono shadow-2xl space-y-1">
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full {isReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}"></span>
      <span class="font-bold text-sm tracking-wide">Next-Gen Engine Harness (M1)</span>
    </div>
    <div class="text-xs text-gray-400">Pure Three.js + Rapier 3D WASM</div>
    <div class="pt-2 text-sm flex justify-between gap-6">
      <span class="text-gray-400">Performance:</span>
      <span class="font-bold text-emerald-400">{currentFps} FPS</span>
    </div>
    <div class="text-xs text-gray-500 pt-1">
      Validation: Sphere drops under gravity &amp; bounces on ground
    </div>
  </div>
</div>
