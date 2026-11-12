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
  import EditorToolbar from "$lib/components/editor/EditorToolbar.svelte";
  import PathWaypointInspector from "$lib/components/editor/PathWaypointInspector.svelte";
  import PlaytestOverlay from "$lib/components/editor/PlaytestOverlay.svelte";

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
  <EditorToolbar
    {isReady}
    {isPlaytestMode}
    {currentFps}
    {activeTheme}
    {showBoundary}
    {isTrackPathMode}
    {isEraseMode}
    {saveFeedback}
    {savedCourseId}
    on:setTheme={(e) => (activeTheme = e.detail)}
    on:openWfc={() => (showWfcModal = true)}
    on:loadSunnyCreek={handleLoadSunnyCreek}
    on:loadBigTop={handleLoadBigTop}
    on:autoDecorate={handleAutoDecorate}
    on:toggleBoundary={toggleBoundary}
    on:frameCamera={() => engine?.frameCameraOnCourse()}
    on:toggleTrackPath={toggleTrackPathMode}
    on:toggleErase={toggleEraseMode}
    on:clearToTee={handleClearToTee}
    on:undo={handleUndo}
    on:redo={handleRedo}
    on:togglePlaytest={togglePlaytestMode}
    on:saveCourse={handleSaveCourse}
  />

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
      <PathWaypointInspector
        {selectedSplineNode}
        {gridSnapSize}
        on:stepElevation={(e) => editorController?.stepSelectedNodeElevation(e.detail)}
        on:toggleBevel={() => editorController?.toggleSelectedNodeBevel()}
        on:stepBevel={(e) => editorController?.stepSelectedNodeBevel(e.detail)}
        on:deleteNode={() => editorController?.deleteSelectedSplineNode()}
        on:setGridSnap={(e) => (gridSnapSize = e.detail)}
        on:alignPath={() => editorController?.snapAllSplineNodesToGrid()}
      />
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

  <!-- Playtest HUD & Sink Modal -->
  {#if isPlaytestMode}
    <PlaytestOverlay
      par={3}
      {strokes}
      {isCupSunk}
      on:respawn={() => engine.ballController.respawn()}
      on:puttAgain={() => {
        engine.resetBallToTee();
        isCupSunk = false;
        strokes = 0;
      }}
      on:exitPlaytest={togglePlaytestMode}
    />
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
