<script>
  import { onMount, onDestroy } from "svelte";
  import { GameEngine } from "$lib/engine/GameEngine";
  import { carnivalParkCourse } from "$lib/courses/carnivalParkCourse";
  import { loadCustomCourses } from "$lib/engine/course/CourseStorage";
  import { resolvePlayStartHoleIndex } from "$lib/components/courses/CourseHubHelpers";
  import PlayHud from "$lib/components/play/PlayHud.svelte";
  import PlayResultModals from "$lib/components/play/PlayResultModals.svelte";

  let canvas;
  let engine;

  let availableCourses = [carnivalParkCourse];
  let activeCourse = carnivalParkCourse;
  let selectedCourseId = carnivalParkCourse.id;

  let currentHoleIndex = 0;
  let currentHole = activeCourse.holes[0];
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

    const custom = loadCustomCourses();
    if (custom.length > 0) {
      availableCourses = [carnivalParkCourse, ...custom];
    }

    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const reqCourse = params?.get("course");
    if (reqCourse) {
      const found = availableCourses.find((c) => c.id === reqCourse);
      if (found) {
        activeCourse = found;
        selectedCourseId = found.id;
      }
    }

    engine = new GameEngine(canvas);
    isMuted = engine.audio.getMuted();
    await engine.init();
    engine.renderPipeline.resize();

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

    const startIdx = params ? resolvePlayStartHoleIndex(params, activeCourse) : 0;
    loadHole(startIdx);
    engine.start();
    isReady = true;
  });

  function selectCourseById(id) {
    const found = availableCourses.find((c) => c.id === id);
    if (!found) return;
    activeCourse = found;
    selectedCourseId = found.id;
    restartCourse();
  }

  function loadHole(index) {
    if (index >= activeCourse.holes.length) {
      isCourseFinished = true;
      return;
    }

    currentHoleIndex = index;
    currentHole = activeCourse.holes[index];
    strokes = 0;
    if (engine.ballController) engine.ballController.strokes = 0;
    isCupSunk = false;

    engine.courseManager.loadHole(currentHole);
    engine.ballController.createPhysicsBody(engine.courseManager.spawnPosition);

    if (engine.courseManager.goalPosition) {
      engine.cameraController.playIntroFlyover(
        engine.courseManager.spawnPosition,
        engine.courseManager.goalPosition,
        2.0,
        engine.courseManager.spawnHeading
      );
    } else {
      engine.cameraController.setHeading(engine.courseManager.spawnHeading);
      engine.cameraController.setTarget(engine.courseManager.spawnPosition);
      engine.cameraController.snapToTarget();
    }
  }

  function toggleOverview() {
    if (!engine) return;
    engine.cameraController.toggleOverview();
  }

  function handleKeydown(ev) {
    if (ev.code === "Space") {
      toggleOverview();
    }
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
    engine.cameraController.setHeading(engine.courseManager.spawnHeading);
    engine.cameraController.snapToTarget();
  }

  onDestroy(() => {
    engine?.dispose();
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
  <title>Play Campaign | Mini Golf Mania</title>
</svelte:head>

<div class="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
  <canvas bind:this={canvas} class="w-full h-full block cursor-crosshair"></canvas>

  <PlayHud
    {availableCourses}
    {activeCourse}
    bind:selectedCourseId
    {currentHole}
    {strokes}
    {totalScore}
    {isMuted}
    on:selectCourse={(e) => selectCourseById(e.detail)}
    on:toggleOverview={toggleOverview}
    on:toggleAudio={toggleAudio}
    on:respawn={respawnBall}
  />

  <PlayResultModals
    {isCupSunk}
    {isCourseFinished}
    {currentHole}
    {activeCourse}
    {strokes}
    {totalScore}
    {scoreCard}
    on:nextHole={nextHole}
    on:restartCourse={restartCourse}
  />
</div>

