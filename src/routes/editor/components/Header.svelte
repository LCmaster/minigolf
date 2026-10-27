<script>
  import { AppBar } from "@skeletonlabs/skeleton";
  import { getModalStore, getDrawerStore } from "@skeletonlabs/skeleton";
  import { useEditor } from "../context";

  const {
    testing,
    previewing,
    debugPhysics,
    controlPoints,
    stage,
    history,
    extendTrack,
  } = useEditor();

  export let showingAssets = true;
  export let showLeftPanel = true;
  export let showRightPanel = true;

  $: canUndo = history.canUndo;
  $: canRedo = history.canRedo;

  const modalStore = getModalStore();
  const drawerStore = getDrawerStore();

  const invalidModal = {
    type: "alert",
    title: "Error",
    buttonTextCancel: "Ok",
    body: "To preview a level you need at least 2 control points.",
  };

  const menuDrawer = {
    id: "menu-drawer",
    position: "right",
    width: "w-64",
  };

  $: valid = $controlPoints && $controlPoints.length >= 2;
</script>

<AppBar
  background="bg-surface-900/95 border-b border-surface-500/30"
  padding="px-4 py-2"
  gridColumns="grid-cols-[auto_1fr_auto]"
>
  <svelte:fragment slot="lead">
    <div class="flex items-center gap-3">
      <a href="/" class="flex items-center gap-1.5 hover:opacity-80 transition" title="Back to Home">
        <strong class="uppercase text-base tracking-wide text-white">minigolfmania</strong>
        <span class="badge variant-soft-primary text-[10px] uppercase font-bold">Editor 2.0</span>
      </a>

      {#if !$testing && !$previewing}
        <div class="h-5 w-px bg-surface-500/40 mx-1"></div>
        <button
          type="button"
          class="btn btn-sm {showLeftPanel ? 'variant-soft-primary' : 'variant-soft'} text-xs py-1 px-2.5"
          title="Toggle Outliner Panel"
          on:click={() => (showLeftPanel = !showLeftPanel)}
        >
          ☰ Outliner
        </button>
        <button
          type="button"
          class="btn btn-sm {showingAssets ? 'variant-soft-primary' : 'variant-soft'} text-xs py-1 px-2.5"
          title="Toggle Bottom Obstacle Dock"
          on:click={() => (showingAssets = !showingAssets)}
        >
          🧱 Obstacles Dock
        </button>
      {/if}
    </div>
  </svelte:fragment>

  <!-- Center Quick Course Bar -->
  <div class="flex items-center justify-center gap-2">
    {#if !$testing && !$previewing}
      <input
        type="text"
        class="input text-xs py-1 px-2.5 w-44 bg-surface-800/80 border-surface-500/30 text-white"
        placeholder="Untitled Hole..."
        bind:value={$stage.name}
      />
      <button
        type="button"
        class="btn btn-sm variant-filled-primary text-xs py-1 px-2.5 font-semibold"
        title="Extend Track Forward (Shortcut: A)"
        on:click={extendTrack}
      >
        + Extend Track (A)
      </button>
    {/if}
  </div>

  <svelte:fragment slot="trail">
    {#if $testing || $previewing}
      <!-- Exit & Debug buttons shown in both test and preview modes -->
      <div class="flex items-center gap-2">
        {#if $previewing}
          <span class="badge variant-soft-secondary text-xs">Preview Mode</span>
        {:else if $testing}
          <span class="badge variant-soft-success text-xs">Test Play (P / Esc)</span>
        {/if}
        <button
          type="button"
          class="btn btn-sm {$debugPhysics ? 'variant-filled-warning' : 'variant-soft'} text-xs py-1"
          style="z-index: 9999; pointer-events: auto;"
          title="Toggle Physics Collider Wireframes (` or F3)"
          on:click={(e) => {
            e.stopPropagation();
            $debugPhysics = !$debugPhysics;
          }}
        >
          Colliders (F3)
        </button>
        <button
          type="button"
          class="btn btn-sm variant-filled-error text-xs py-1"
          style="z-index: 9999; pointer-events: auto;"
          title="Exit to Editor (Esc)"
          on:click={(e) => {
            e.stopPropagation();
            if ($testing) testing.set(false);
            if ($previewing) previewing.set(false);
          }}
        >
          ✕ Exit
        </button>
      </div>
    {:else}
      <div class="flex items-center gap-1.5">
        <!-- Undo / Redo -->
        <button
          type="button"
          class="btn-icon btn-icon-sm variant-soft"
          disabled={!$canUndo}
          title="Undo (Ctrl+Z)"
          on:click={() => history.undo()}
        >
          ↩
        </button>
        <button
          type="button"
          class="btn-icon btn-icon-sm variant-soft"
          disabled={!$canRedo}
          title="Redo (Ctrl+Y)"
          on:click={() => history.redo()}
        >
          ↪
        </button>

        <!-- Toggle Physics Wireframes -->
        <button
          type="button"
          class="btn btn-sm {$debugPhysics ? 'variant-filled-warning' : 'variant-soft'} text-xs py-1 px-2.5"
          title="Toggle Physics Collider Wireframes (` or F3)"
          on:click={() => ($debugPhysics = !$debugPhysics)}
        >
          Colliders
        </button>

        <!-- Toggle Inspector -->
        <button
          type="button"
          class="btn btn-sm {showRightPanel ? 'variant-soft-primary' : 'variant-soft'} text-xs py-1 px-2.5"
          title="Toggle Right Inspector Panel"
          on:click={() => (showRightPanel = !showRightPanel)}
        >
          Inspector
        </button>

        <!-- Preview -->
        <button
          id="btn-preview"
          type="button"
          class="btn-icon btn-icon-sm variant-soft"
          disabled={!valid}
          title="Preview Camera Flyover"
          on:click={() => {
            if (valid) {
              $previewing = true;
            } else {
              modalStore.trigger(invalidModal);
            }
          }}
        >
          <img src="/editor-icons/eye-white.svg" alt="Preview" class="w-4 h-4" />
        </button>

        <!-- Play / Test -->
        <button
          id="btn-play"
          type="button"
          class="btn btn-sm variant-filled-success text-xs py-1 px-3 font-bold flex items-center gap-1.5"
          disabled={!valid}
          title="Play / Test Hole (Shortcut: P)"
          on:click={() => {
            if (valid) {
              $testing = true;
            } else {
              modalStore.trigger(invalidModal);
            }
          }}
        >
          <img src="/editor-icons/play.svg" alt="Play" class="w-3.5 h-3.5" />
          <span>Play (P)</span>
        </button>

        <!-- Save / Menu Drawer -->
        <button
          type="button"
          class="btn btn-sm variant-filled-primary text-xs py-1 px-2.5 font-semibold"
          title="Save & Course Menu"
          on:click={() => {
            drawerStore.open(menuDrawer);
          }}
        >
          💾 Save / Menu
        </button>
      </div>
    {/if}
  </svelte:fragment>
</AppBar>
