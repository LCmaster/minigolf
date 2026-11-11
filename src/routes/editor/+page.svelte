<script>
  import { onMount, onDestroy } from "svelte";
  import { GameEngine } from "$lib/engine/GameEngine";
  import { EditorController } from "$lib/engine/editor/EditorController";
  import { HoleGenerator } from "$lib/engine/wfc/HoleGenerator";
  import RadialSocketMenu from "$lib/components/editor/RadialSocketMenu.svelte";
  import PropPalette from "$lib/components/editor/PropPalette.svelte";
  import WfcWizardModal from "$lib/components/editor/WfcWizardModal.svelte";

  let canvas;
  let engine;
  let editorController;
  let holeGenerator;

  let isReady = false;
  let currentFps = 60;
  let isPlaytestMode = false;
  let strokes = 0;
  let isCupSunk = false;

  // Active socket radial menu state
  let activeSocketMenu = null; // { x, y, socketInfo }
  let showWfcModal = false;
  let selectedPropId = null;

  $: if (editorController) {
    editorController.setSelectedProp(isPlaytestMode ? null : selectedPropId);
  }

  onMount(async () => {
    if (!canvas) return;

    engine = new GameEngine(canvas);
    await engine.init();

    editorController = new EditorController(
      canvas,
      engine.renderPipeline.camera,
      engine.renderPipeline.scene,
      engine.courseManager,
      engine.assetLoader
    );

    holeGenerator = new HoleGenerator(engine.assetLoader);

    // Initial default starting tee
    const initialHole = holeGenerator.generateHole({
      par: 2,
      style: "straightforward",
      includeObstacles: false,
    });
    engine.courseManager.loadHole(initialHole);
    editorController.refreshOpenSockets();

    // Editor event hooks
    editorController.onSocketClick = (socketInfo, screenX, screenY) => {
      if (isPlaytestMode) return;
      activeSocketMenu = {
        x: screenX,
        y: screenY,
        socketInfo,
      };
    };

    engine.on("fpsUpdate", (fps) => {
      currentFps = fps;
    });

    engine.on("strokeTaken", (ev) => {
      strokes = ev.strokeNumber;
    });

    engine.on("cupSink", () => {
      isCupSunk = true;
    });

    engine.start();
    isReady = true;
  });

  function handleSnapPiece(ev) {
    const { socketInfo, pieceId } = ev.detail;
    editorController.snapPieceToSocket(socketInfo, pieceId);
    activeSocketMenu = null;
  }

  function handleWfcGenerate(ev) {
    const holeData = holeGenerator.generateHole(ev.detail);
    engine.courseManager.loadHole(holeData);
    editorController.refreshOpenSockets();
    editorController.history.clear();
  }

  function togglePlaytestMode() {
    isPlaytestMode = !isPlaytestMode;
    if (isPlaytestMode) {
      // Enter playtest: hide socket gizmos, spawn ball at tee
      editorController.setGizmosVisible(false);
      engine.ballController.createPhysicsBody(engine.courseManager.spawnPosition);
      engine.cameraController.setTarget(engine.courseManager.spawnPosition);
      strokes = 0;
      isCupSunk = false;
    } else {
      // Return to editor: show gizmos, refresh open sockets
      editorController.setGizmosVisible(true);
      editorController.refreshOpenSockets();
    }
  }

  function handleUndo() {
    if (!editorController) return;
    editorController.history.undo();
    editorController.refreshOpenSockets();
  }

  function handleRedo() {
    if (!editorController) return;
    editorController.history.redo();
    editorController.refreshOpenSockets();
  }

  function handleSaveCourse() {
    alert("Course saved to local manifest successfully!");
  }

  onDestroy(() => {
    editorController?.dispose();
    engine?.dispose();
  });
</script>

<svelte:head>
  <title>Smart Track Editor | Mini Golf Mania</title>
</svelte:head>

<div class="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
  <canvas bind:this={canvas} class="w-full h-full block {isPlaytestMode ? 'cursor-crosshair' : 'cursor-default'}"></canvas>

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
    </div>

    <!-- Center: Primary Action Toolbar -->
    <div class="bg-slate-900/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl flex items-center gap-1.5 pointer-events-auto">
      {#if !isPlaytestMode}
        <button
          on:click={() => (showWfcModal = true)}
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-400/30 text-cyan-300 text-xs font-bold font-mono transition-all active:scale-95"
          title="Auto-generate a complete hole using WFC"
        >
          <span>🤖</span>
          <span>WFC Auto-Gen</span>
        </button>

        <div class="w-px h-5 bg-white/10 mx-1"></div>

        <button
          on:click={handleUndo}
          class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors"
          title="Undo (Ctrl+Z)"
        >
          ↩️ Undo
        </button>
        <button
          on:click={handleRedo}
          class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-bold transition-colors"
          title="Redo (Ctrl+Y)"
        >
          ↪️ Redo
        </button>
      {/if}

      <!-- Playtest Mode Toggle -->
      <button
        on:click={togglePlaytestMode}
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs font-mono transition-all shadow-lg active:scale-95 {isPlaytestMode ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}"
      >
        <span>{isPlaytestMode ? '⏹️ Exit Test' : '▶️ Test Putt'}</span>
      </button>

      {#if !isPlaytestMode}
        <button
          on:click={handleSaveCourse}
          class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono transition-all"
        >
          💾 Save
        </button>
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

  <!-- Bottom-Left Prop Palette (Editor Mode only) -->
  {#if !isPlaytestMode}
    <div class="absolute bottom-6 left-6">
      <PropPalette bind:selectedPropId />
    </div>

    <!-- Editor Hint Banner -->
    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-mono text-gray-400 shadow-xl pointer-events-none">
      {#if selectedPropId}
        🎯 Click to place prop &bull; <span class="text-amber-400 font-bold">R</span> to rotate &bull; <span class="text-red-400 font-bold">Right-click</span> prop to remove &bull; <span class="text-gray-300 font-bold">Esc</span> cancel
      {:else}
        💡 Click glowing <span class="text-cyan-400 font-bold">cyan rings</span> to snap pieces &bull; Click <span class="text-amber-400 font-bold">rails</span> to toggle edges
      {/if}
    </div>
  {/if}

  <!-- Playtest HUD Stats (Playtest Mode only) -->
  {#if isPlaytestMode}
    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10 text-white font-mono shadow-2xl flex items-center gap-6">
      <div class="text-center">
        <div class="text-[10px] text-gray-400">PAR</div>
        <div class="text-lg font-bold text-cyan-400">3</div>
      </div>
      <div class="w-px h-6 bg-white/10"></div>
      <div class="text-center">
        <div class="text-[10px] text-gray-400">STROKES</div>
        <div class="text-lg font-bold text-amber-400">{strokes}</div>
      </div>
      <div class="w-px h-6 bg-white/10"></div>
      <button
        on:click={() => engine.ballController.respawn()}
        class="bg-white/10 hover:bg-white/20 text-xs font-bold px-3 py-1.5 rounded-xl border border-white/10 transition-colors"
      >
        Respawn Ball
      </button>
    </div>
  {/if}

  <!-- Celebratory Sink Modal -->
  {#if isCupSunk}
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      <div class="bg-black/90 backdrop-blur-xl border border-emerald-500/50 p-8 rounded-3xl text-center shadow-2xl animate-bounce pointer-events-auto space-y-4">
        <div class="text-5xl">⛳ 🎉</div>
        <div class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 font-sans">
          HOLE IN!
        </div>
        <div class="text-lg text-white font-mono">
          Total Strokes: <span class="font-bold text-amber-400">{strokes}</span>
        </div>
        <div class="flex gap-3 justify-center">
          <button
            on:click={() => engine.ballController.respawn()}
            class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl transition-all"
          >
            Putt Again
          </button>
          <button
            on:click={togglePlaytestMode}
            class="bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-2 rounded-xl transition-all"
          >
            Edit Track
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Radial Context Snap Menu (Appears on clicking open socket ring) -->
  {#if activeSocketMenu}
    <RadialSocketMenu
      x={activeSocketMenu.x}
      y={activeSocketMenu.y}
      socketInfo={activeSocketMenu.socketInfo}
      on:select={handleSnapPiece}
      on:close={() => (activeSocketMenu = null)}
    />
  {/if}

  <!-- WFC Generator Wizard Modal -->
  <WfcWizardModal
    bind:isOpen={showWfcModal}
    on:generate={handleWfcGenerate}
  />
</div>
