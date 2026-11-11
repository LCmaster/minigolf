<script>
  import { onMount, onDestroy } from "svelte";
  import { GameEngine } from "$lib/engine/GameEngine";
  import { EditorController } from "$lib/engine/editor/EditorController";
  import { HoleGenerator } from "$lib/engine/wfc/HoleGenerator";
  import { autoDecorateHole } from "$lib/engine/wfc/AutoDecorate";
  import { carnivalParkCourse } from "$lib/courses/carnivalParkCourse";
  import { saveCustomCourse } from "$lib/engine/course/CourseStorage";
  import RadialSocketMenu from "$lib/components/editor/RadialSocketMenu.svelte";
  import TileActionMenu from "$lib/components/editor/TileActionMenu.svelte";
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

  let activeTheme = "carnival_park";
  let showBoundary = true;
  let savedCourseId = null;
  let saveFeedback = "";
  let isEraseMode = false;
  let isTrackPathMode = false;
  let selectedPlacedPropId = null;
  let selectedSplineNode = null;
  let gridSnapSize = 1; // 0 | 1 | 3 | 6 meters

  // Active socket radial & tile action menus
  let activeSocketMenu = null; // { x, y, socketInfo }
  let activeTileMenu = null; // { x, y, tileInfo }
  let showWfcModal = false;
  let selectedPropId = null;

  $: if (editorController) {
    editorController.setTheme(activeTheme);
  }

  $: if (editorController) {
    editorController.setGridSnapSize(gridSnapSize);
  }

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

    // Initial default starting Carnival hole
    const initialHole = holeGenerator.generateHole({
      par: 3,
      style: "winding",
      includeObstacles: true,
      theme: activeTheme,
    });
    engine.courseManager.loadHole(initialHole);
    showBoundary = initialHole.showBoundary ?? true;
    editorController.refreshOpenSockets();

    // Start in true free-roam Editor Mode (no ball, free camera)
    engine.setEditorMode(true);
    engine.frameCameraOnCourse();

    editorController.onToolStateChanged = (st) => {
      isEraseMode = st.eraseMode;
      isTrackPathMode = st.trackPathMode;
      selectedPlacedPropId = st.selectedPlacedPropId;
      if (st.eraseMode || st.trackPathMode || st.selectedPropId) {
        activeSocketMenu = null;
        activeTileMenu = null;
      }
      if (st.eraseMode || st.trackPathMode) selectedPropId = null;
    };

    editorController.onSplineSelectionChanged = (info) => {
      selectedSplineNode = info;
    };

    // Editor event hooks
    editorController.onSocketClick = (socketInfo, screenX, screenY) => {
      if (isPlaytestMode) return;
      activeTileMenu = null;
      activeSocketMenu = {
        x: screenX,
        y: screenY,
        socketInfo,
      };
    };

    editorController.onTileClick = (tileInfo, screenX, screenY) => {
      if (isPlaytestMode) return;
      activeSocketMenu = null;
      activeTileMenu = {
        x: screenX,
        y: screenY,
        tileInfo,
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

  function handleTileToggleWall(ev) {
    const { tileInstanceId, side } = ev.detail;
    if (!editorController?.toggleTileWall(tileInstanceId, side)) return;
    if (activeTileMenu) {
      activeTileMenu = {
        ...activeTileMenu,
        tileInfo: editorController.getTileClickInfo(tileInstanceId),
      };
    }
  }

  function handleTileToggleGap(ev) {
    const { tileInstanceId } = ev.detail;
    if (!editorController?.toggleTileGap(tileInstanceId)) return;
    if (activeTileMenu) {
      activeTileMenu = {
        ...activeTileMenu,
        tileInfo: editorController.getTileClickInfo(tileInstanceId),
      };
    }
  }

  function handleTileSwapType(ev) {
    const { tileInstanceId, pieceId, reverseDirection } = ev.detail;
    if (!editorController?.swapTileType(tileInstanceId, pieceId, { reverseDirection })) return;
    if (activeTileMenu) {
      activeTileMenu = {
        ...activeTileMenu,
        tileInfo: editorController.getTileClickInfo(tileInstanceId),
      };
    }
  }

  function resetHoleInEditor(holeData) {
    engine.courseManager.loadHole(holeData);
    showBoundary = holeData.showBoundary ?? true;
    editorController.refreshOpenSockets();
    editorController.syncSplineFromCourse();
    editorController.history.clear();
    engine.frameCameraOnCourse();
  }

  function handleWfcGenerate(ev) {
    if (ev.detail.theme) activeTheme = ev.detail.theme;
    const holeData = holeGenerator.generateHole(ev.detail);
    resetHoleInEditor(holeData);
  }

  function handleLoadSunnyCreek() {
    if (!engine || !editorController) return;
    activeTheme = "carnival_park";
    const hole = JSON.parse(JSON.stringify(carnivalParkCourse.holes[0]));
    resetHoleInEditor(hole);
  }

  function handleLoadBigTop() {
    if (!engine || !editorController) return;
    activeTheme = "carnival_park";
    const hole = JSON.parse(JSON.stringify(carnivalParkCourse.holes[1]));
    resetHoleInEditor(hole);
  }

  function handleClearToTee() {
    if (!engine || !editorController) return;
    const teePiece = activeTheme === "carnival_park" ? "carnival_tee_6x6" : "tee_box_6x6";
    const teeId = `tile_tee_${Date.now()}`;
    resetHoleInEditor({
      holeNumber: 1,
      par: 2,
      teeTileId: teeId,
      cupTileId: "",
      showBoundary,
      tiles: [
        {
          instanceId: teeId,
          kitPieceId: teePiece,
          position: [0, 0, 0],
          rotationY: 0,
          walls: { left: true, right: true },
          connectedSockets: {},
        },
      ],
      props: [],
    });
  }

  function toggleEraseMode() {
    if (!editorController) return;
    if (!isEraseMode) selectedPropId = null;
    editorController.setEraseMode(!isEraseMode);
  }

  function toggleTrackPathMode() {
    if (!editorController) return;
    if (!isTrackPathMode) selectedPropId = null;
    editorController.setTrackPathMode(!isTrackPathMode);
  }

  function handleAutoDecorate() {
    if (!engine || !editorController) return;
    const current = engine.courseManager.exportHoleData(3, 1);
    const additions = autoDecorateHole(current.tiles, current.props, activeTheme, Date.now());
    if (additions.length === 0) return;

    editorController.history.execute({
      name: `Auto-Decorate (${additions.length} props)`,
      execute: () => {
        for (const p of additions) engine.courseManager.addProp(p);
      },
      undo: () => {
        for (const p of additions) engine.courseManager.removeProp(p.instanceId);
      },
    });
  }

  function toggleBoundary() {
    if (!engine) return;
    showBoundary = !showBoundary;
    engine.courseManager.setShowBoundary(showBoundary);
  }

  function togglePlaytestMode() {
    isPlaytestMode = !isPlaytestMode;
    activeSocketMenu = null;
    activeTileMenu = null;
    if (isPlaytestMode) {
      // Enter playtest: spawn ball at tee, enable slingshot & ball-follow camera
      editorController.setEraseMode(false);
      editorController.setGizmosVisible(false);
      engine.setEditorMode(false);
      strokes = 0;
      isCupSunk = false;
    } else {
      // Return to editor: remove ball, restore free-roam camera & socket/spline gizmos
      engine.setEditorMode(true);
      editorController.setGizmosVisible(true);
      editorController.refreshOpenSockets();
      editorController.syncSplineFromCourse();
    }
  }

  function handleUndo() {
    if (!editorController) return;
    editorController.undo();
    activeTileMenu = null;
    activeSocketMenu = null;
  }

  function handleRedo() {
    if (!editorController) return;
    editorController.redo();
    activeTileMenu = null;
    activeSocketMenu = null;
  }

  function handleSaveCourse() {
    if (!engine) return;
    const hole = engine.courseManager.exportHoleData(3, 1);
    const id = savedCourseId || `custom_${Date.now()}`;
    savedCourseId = id;
    saveCustomCourse({
      id,
      name: activeTheme === "carnival_park" ? "Custom Carnival Course" : "Custom Country Club Course",
      theme: activeTheme,
      authorId: "local_player",
      authorName: "Editor Creator",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      holes: [hole],
    });
    saveFeedback = "Saved!";
    setTimeout(() => (saveFeedback = ""), 2500);
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
        <div class="flex items-center bg-black/30 rounded-xl p-0.5 border border-white/10">
          <button
            on:click={() => (activeTheme = "carnival_park")}
            class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all {activeTheme === 'carnival_park' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}"
          >
            🎪 Carnival
          </button>
          <button
            on:click={() => (activeTheme = "country_club")}
            class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold font-mono transition-all {activeTheme === 'country_club' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}"
          >
            🏌️ Classic
          </button>
        </div>

        <button
          on:click={() => (showWfcModal = true)}
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/30 hover:to-emerald-500/30 border border-cyan-400/30 text-cyan-300 text-xs font-bold font-mono transition-all active:scale-95"
          title="Auto-generate a complete hole using WFC"
        >
          <span>🤖</span>
          <span>Auto-Gen</span>
        </button>

        <button
          on:click={handleLoadSunnyCreek}
          class="px-2.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 text-xs font-bold font-mono transition-all"
          title="Load Sunny Creek & Midway Bend showcase hole"
        >
          🌉 Sunny Creek
        </button>

        <button
          on:click={handleLoadBigTop}
          class="px-2.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-rose-300 text-xs font-bold font-mono transition-all"
          title="Load Big Top Windmill showcase hole"
        >
          🎡 Big Top
        </button>

        <button
          on:click={handleAutoDecorate}
          class="px-2.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-xs font-bold font-mono transition-all"
          title="Decorate surroundings with hill knolls, trees, boulders & toadstools"
        >
          🌲 Decorate
        </button>

        <button
          on:click={toggleBoundary}
          class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold font-mono transition-colors {showBoundary ? 'text-amber-300' : 'text-gray-500'}"
          title="Toggle park perimeter fence"
        >
          🪵 Fence
        </button>

        <button
          on:click={() => engine?.frameCameraOnCourse()}
          class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-bold font-mono transition-colors"
          title="Center camera on course (F)"
        >
          🎯 Frame
        </button>

        <button
          on:click={toggleTrackPathMode}
          class="px-2.5 py-2 rounded-xl border text-xs font-bold font-mono transition-all {isTrackPathMode ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-300'}"
          title="Edit spline track path, handles & elevation (T)"
        >
          〰️ Edit Track
        </button>

        <button
          on:click={toggleEraseMode}
          class="px-2.5 py-2 rounded-xl border text-xs font-bold font-mono transition-all {isEraseMode ? 'bg-red-500/30 border-red-400 text-red-200 shadow-lg' : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-300'}"
          title="Erase props or non-root track tiles (X)"
        >
          🧹 Erase
        </button>

        <button
          on:click={handleClearToTee}
          class="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-300 hover:text-red-200 text-xs font-bold font-mono transition-colors"
          title="Reset workspace to single tee tile"
        >
          🗑️ Clear
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
          {saveFeedback || '💾 Save'}
        </button>
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

  <!-- Bottom-Left Prop Palette (Editor Mode only) -->
  {#if !isPlaytestMode}
    <div class="absolute bottom-6 left-6">
      <PropPalette
        bind:selectedPropId
        theme={activeTheme}
        manifest={isReady ? engine?.assetLoader?.getManifest() : null}
      />
    </div>

    <!-- Selected Spline Waypoint Inspector (Track Edit Mode only) -->
    {#if isTrackPathMode && selectedSplineNode}
      <div class="absolute bottom-6 right-6 bg-slate-900/90 backdrop-blur-xl border border-cyan-400/30 p-3.5 rounded-2xl shadow-2xl text-white font-mono space-y-2.5 w-64">
        <div class="flex justify-between items-center border-b border-white/10 pb-1.5">
          <span class="text-xs font-bold text-cyan-300 uppercase tracking-wider">
            {#if selectedSplineNode.isRoot}
              ⛳ Tee Start (#0)
            {:else if selectedSplineNode.index === selectedSplineNode.nodeCount - 1}
              🏁 Path End (#{selectedSplineNode.index})
            {:else}
              〰️ Waypoint #{selectedSplineNode.index}
            {/if}
          </span>
          <span class="text-[11px] text-amber-300 font-bold">
            Y: {selectedSplineNode.elevationMeters.toFixed(1)}m
          </span>
        </div>

        {#if selectedSplineNode.invalidCount > 0}
          <div class="px-2.5 py-1.5 rounded-xl bg-red-500/20 border border-red-400/50 text-[10px] font-bold text-red-200 leading-snug">
            ⚠️ {selectedSplineNode.isInvalid ? 'This point is highlighted Red: ' : 'Red path points: '}unreachable with kit tiles. Track built up to last valid point.
          </div>
        {/if}

        <div class="grid grid-cols-2 gap-1.5 text-xs font-bold">
          <button
            on:click={() => editorController?.stepSelectedNodeElevation(-1)}
            class="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition-colors"
            title="Lower elevation step (-1.5m)"
          >
            ⬇️ -1.5m
          </button>
          <button
            on:click={() => editorController?.stepSelectedNodeElevation(1)}
            class="py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 transition-colors"
            title="Raise elevation step (+1.5m)"
          >
            ⬆️ +1.5m
          </button>
        </div>

        <div class="grid grid-cols-2 gap-1.5 text-xs font-bold">
          <button
            on:click={() => editorController?.toggleSelectedNodeBevel()}
            disabled={!selectedSplineNode.canBevel}
            class="py-1.5 px-2 rounded-xl border transition-colors {!selectedSplineNode.canBevel ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed' : selectedSplineNode.bevelRadius > 0.15 ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200' : 'bg-amber-500/20 border-amber-400/50 text-amber-200'}"
            title="Toggle between Sharp corner turn and rounded Bevel arc"
          >
            {selectedSplineNode.bevelRadius > 0.15 ? `⭕ Bevel ${selectedSplineNode.bevelRadius.toFixed(1)}m` : '📐 Sharp'}
          </button>
          <button
            on:click={() => editorController?.deleteSelectedSplineNode()}
            disabled={!selectedSplineNode.canDelete}
            class="py-1.5 px-2 rounded-xl border text-xs font-bold transition-colors {selectedSplineNode.canDelete ? 'bg-red-500/20 hover:bg-red-500/35 border-red-400/40 text-red-200' : 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'}"
            title="Delete selected waypoint (Del)"
          >
            🗑️ Del Node
          </button>
        </div>

        {#if selectedSplineNode.canBevel}
          <div class="grid grid-cols-2 gap-1.5 text-xs font-bold">
            <button
              on:click={() => editorController?.stepSelectedNodeBevel(-3.0)}
              disabled={selectedSplineNode.bevelRadius <= 0.15}
              class="py-1 px-2 rounded-xl border transition-colors {selectedSplineNode.bevelRadius > 0.15 ? 'bg-white/5 hover:bg-white/15 border-white/10 text-gray-200' : 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'}"
              title="Decrease corner bevel radius (-3m)"
            >
              ➖ Bevel
            </button>
            <button
              on:click={() => editorController?.stepSelectedNodeBevel(3.0)}
              disabled={selectedSplineNode.bevelRadius >= selectedSplineNode.maxBevelRadius - 0.15}
              class="py-1 px-2 rounded-xl border transition-colors {selectedSplineNode.bevelRadius < selectedSplineNode.maxBevelRadius - 0.15 ? 'bg-white/5 hover:bg-white/15 border-white/10 text-gray-200' : 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed'}"
              title="Increase corner bevel radius (+3m)"
            >
              ➕ Bevel
            </button>
          </div>
        {/if}

        <!-- World Grid Snap Selector -->
        <div class="pt-2 border-t border-white/10 space-y-1.5">
          <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span>⊞ World Grid Snap</span>
            <span class="text-cyan-300">{gridSnapSize > 0 ? `${gridSnapSize}m` : 'Off'}</span>
          </div>
          <div class="grid grid-cols-4 gap-1 bg-black/30 p-0.5 rounded-xl border border-white/10 text-[11px] font-bold">
            {#each [
              { size: 0, label: 'Off' },
              { size: 1, label: '1m' },
              { size: 3, label: '3m' },
              { size: 6, label: '6m' },
            ] as opt}
              <button
                on:click={() => (gridSnapSize = opt.size)}
                class="py-1 rounded-lg transition-colors {gridSnapSize === opt.size ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50' : 'text-slate-400 hover:text-white'}"
              >
                {opt.label}
              </button>
            {/each}
          </div>
          {#if gridSnapSize > 0}
            <button
              on:click={() => editorController?.snapAllSplineNodesToGrid()}
              class="w-full py-1 px-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-xs font-bold text-cyan-200 transition-colors"
              title="Align all existing waypoints cleanly onto the active world grid"
            >
              🧲 Align Path to {gridSnapSize}m Grid
            </button>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Editor Hint Banner -->
    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-xs font-mono text-gray-400 shadow-xl pointer-events-none whitespace-nowrap">
      {#if isTrackPathMode}
        📏 <span class="text-cyan-300 font-bold">Track Path:</span> Drag Corner ({gridSnapSize > 0 ? `${gridSnapSize}m grid` : 'free'}, Shift=free) &bull; Drag Bevel &bull; <span class="text-amber-300 font-bold">Double-Click</span> add &bull; <span class="text-red-300 font-bold">Del</span> remove
      {:else if isEraseMode}
        🧹 <span class="text-red-300 font-bold">Erase Mode:</span> Click prop or track tile to remove &bull; <span class="text-gray-200 font-bold">X / Esc</span> exit
      {:else if selectedPropId}
        🎯 Click to place &bull; <span class="text-amber-400 font-bold">R</span> rotate &bull; <span class="text-gray-200 font-bold">Esc</span> cancel
      {:else if selectedPlacedPropId}
        ✨ Drag prop to move &bull; <span class="text-amber-400 font-bold">R</span> rotate &bull; <span class="text-red-400 font-bold">Del</span> remove
      {:else}
        🖱️ <span class="text-cyan-300 font-bold">Click tile</span> to swap/walls/gap &bull; <span class="text-cyan-300 font-bold">WASD</span> Pan &bull; <span class="text-cyan-300 font-bold">Right-drag</span> Orbit &bull; <span class="text-cyan-300 font-bold">T</span> Edit Track &bull; <span class="text-amber-300 font-bold">F</span> Frame
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
      <div class="bg-black/90 backdrop-blur-xl border border-emerald-500/50 p-8 rounded-3xl text-center shadow-2xl pointer-events-auto space-y-4">
        <div class="text-5xl">⛳ 🎉</div>
        <div class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 font-sans">
          HOLE IN!
        </div>
        <div class="text-lg text-white font-mono">
          Total Strokes: <span class="font-bold text-amber-400">{strokes}</span>
        </div>
        <div class="flex gap-3 justify-center">
          <button
            on:click={() => {
              engine.resetBallToTee();
              isCupSunk = false;
              strokes = 0;
            }}
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
      theme={activeTheme}
      on:select={handleSnapPiece}
      on:close={() => (activeSocketMenu = null)}
    />
  {/if}

  <!-- Floating Tile Action Popover (Appears on clicking any tile or gap outline) -->
  {#if activeTileMenu && activeTileMenu.tileInfo}
    <TileActionMenu
      x={activeTileMenu.x}
      y={activeTileMenu.y}
      tileInfo={activeTileMenu.tileInfo}
      theme={activeTheme}
      on:toggleWall={handleTileToggleWall}
      on:toggleGap={handleTileToggleGap}
      on:swapType={handleTileSwapType}
      on:close={() => (activeTileMenu = null)}
    />
  {/if}

  <!-- WFC Generator Wizard Modal -->
  <WfcWizardModal
    bind:isOpen={showWfcModal}
    theme={activeTheme}
    on:generate={handleWfcGenerate}
  />
</div>
