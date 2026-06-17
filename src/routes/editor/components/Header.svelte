<script>
  import { AppBar } from "@skeletonlabs/skeleton";
  import { getModalStore, getDrawerStore } from "@skeletonlabs/skeleton";
  // import { editor, blocks } from "../store";
  import { useEditor } from "../context";

  const { testing, controlPoints } = useEditor();

  $: canUndo = controlPoints.canUndo;
  $: canRedo = controlPoints.canRedo;

  const modalStore = getModalStore();
  const drawerStore = getDrawerStore();

  const invalidModal = {
    type: "alert",
    title: "Error",
    buttonTextCancel: "Ok",
    body: "To test a level you need at least 2 control points.",
  };



  const menuDrawer = {
    id: "menu-drawer",
    position: "right",
    width: "w-64",
  };

  $: valid = $controlPoints && $controlPoints.length >= 2;
</script>

<AppBar background={"variant-filled"} gridColumns="grid-cols-[1fr_auto]">
  <h1>
    <strong class="uppercase text-lg">minigolfmania</strong>
    <span class="font-thin italic text-sm">Editor</span>
  </h1>
  <svelte:fragment slot="trail">
    {#if $testing}
      <button
        type="button"
        class="btn-icon btn-icon-sm variant-filled"
        on:click={() => {
          $testing = false;
        }}
      >
        <img src="/editor/close.svg" alt="Close" />
      </button>
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
        <!-- Play -->
        <button
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
