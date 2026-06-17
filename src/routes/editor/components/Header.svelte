<script>
  import { AppBar } from "@skeletonlabs/skeleton";
  import { getModalStore, getDrawerStore } from "@skeletonlabs/skeleton";
  import { useEditor } from "../context";

  const { testing, previewing, controlPoints, stage } = useEditor();

  $: canUndo = controlPoints.canUndo;
  $: canRedo = controlPoints.canRedo;

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

<AppBar background={"variant-filled"} gridColumns="grid-cols-[1fr_auto]">
  <h1 class="flex items-center gap-4">
    <div>
      <strong class="uppercase text-lg">minigolfmania</strong>
      <span class="font-thin italic text-sm">Editor</span>
    </div>
    {#if $stage?.name}
      <div class="h-6 w-px bg-surface-500/50 mx-2"></div>
      <span class="text-sm font-semibold text-primary-400">{$stage.name}</span>
    {/if}
  </h1>
  <svelte:fragment slot="trail">
    {#if $testing || $previewing}
      <!-- Exit button shown in both test and preview modes -->
      <div class="flex items-center gap-2">
        {#if $previewing}
          <span class="text-sm opacity-60 italic">Preview Mode</span>
        {/if}
        <button
          type="button"
          class="btn-icon btn-icon-sm variant-filled"
          style="z-index: 9999; pointer-events: auto;"
          on:click={(e) => {
            e.stopPropagation();
            if ($testing) testing.set(false);
            if ($previewing) previewing.set(false);
          }}
        >
          <img src="/editor/close.svg" alt="Close" />
        </button>
      </div>
    {:else}
      <div class="flex gap-2">
        <!-- Undo -->
        <button
          type="button"
          class="btn-icon btn-icon-sm variant-filled"
          disabled={!$canUndo}
          title="Undo (Ctrl+Z)"
          on:click={() => controlPoints.undo()}
        >
          ↩
        </button>
        <!-- Redo -->
        <button
          type="button"
          class="btn-icon btn-icon-sm variant-filled"
          disabled={!$canRedo}
          title="Redo (Ctrl+Y)"
          on:click={() => controlPoints.redo()}
        >
          ↪
        </button>
        <!-- Preview (eye icon) — left of Play -->
        <button
          id="btn-preview"
          type="button"
          class="btn-icon btn-icon-sm variant-filled"
          disabled={!valid}
          title="Preview course"
          on:click={() => {
            if (valid) {
              $previewing = true;
            } else {
              modalStore.trigger(invalidModal);
            }
          }}
        >
          <img src="/editor/eye-white.svg" alt="Preview" />
        </button>
        <!-- Play -->
        <button
          id="btn-play"
          type="button"
          class="btn-icon btn-icon-sm variant-filled"
          disabled={!valid}
          on:click={() => {
            if (valid) {
              $testing = true;
            } else {
              modalStore.trigger(invalidModal);
            }
          }}
        >
          <img src="/editor/play.svg" alt="Play" />
        </button>
        <button
          type="button"
          class="btn-icon btn-icon-sm variant-filled"
          on:click={() => {
            drawerStore.open(menuDrawer);
          }}
        >
          <img src="/editor/menu.svg" alt="Menu" />
        </button>
      </div>
    {/if}
  </svelte:fragment>
</AppBar>
