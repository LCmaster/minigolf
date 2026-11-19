<script>
  import { onMount, onDestroy } from "svelte";
  import HowToPlayCard from "$lib/components/home/HowToPlayCard.svelte";
  import HomeOverlay from "$lib/components/home/HomeOverlay.svelte";
  import { GameEngine } from "$lib/engine/GameEngine";
  import { carnivalParkCourse } from "$lib/courses/carnivalParkCourse";
  import { auth } from "$lib/firebase";
  import { user } from "$lib/user";
  import { canEditLevels } from "$lib/stores/profile";
  import { signOut } from "firebase/auth";

  let canvas;
  let engine;
  let isSceneReady = false;
  let isMuted = false;
  let isHowToPlayOpen = false;

  onMount(async () => {
    if (!canvas) return;
    try {
      engine = new GameEngine(canvas);
      isMuted = engine.audio.getMuted();
      await engine.init();
      engine.courseManager.loadHole(carnivalParkCourse.holes[0]);
      engine.setShowcaseTurntableMode(true);
      engine.renderPipeline.resize();
      engine.start();
    } catch (err) {
      console.error("Failed to initialize home 3D flyover:", err);
    } finally {
      isSceneReady = true;
    }
  });

  onDestroy(() => {
    engine?.dispose();
  });

  function handleToggleAudio() {
    if (!engine) return;
    isMuted = engine.audio.toggleMute();
  }

  async function handleSignout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  }
</script>

<svelte:head>
  <title>Mini Golf Mania</title>
</svelte:head>

<div class="relative w-screen min-h-screen overflow-hidden bg-sky-400 select-none">
  <!-- Live 3D Turntable Course Flyover Canvas -->
  <canvas bind:this={canvas} class="fixed inset-0 w-full h-full block"></canvas>

  <!-- Subtle radial vignette so the center cartoon logo & buttons pop over the 3D scene -->
  <div class="fixed inset-0 bg-gradient-to-b from-sky-900/15 via-transparent to-emerald-950/25 pointer-events-none"></div>

  <HomeOverlay
    {isSceneReady}
    user={$user}
    canEditLevels={$canEditLevels}
    {isMuted}
    on:toggleAudio={handleToggleAudio}
    on:openHowToPlay={() => (isHowToPlayOpen = true)}
    on:signOut={handleSignout}
  />

  <HowToPlayCard isOpen={isHowToPlayOpen} onClose={() => (isHowToPlayOpen = false)} />
</div>
