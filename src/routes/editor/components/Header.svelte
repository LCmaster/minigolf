<script>
  import { AppBar } from "@skeletonlabs/skeleton";
  import { getModalStore, getDrawerStore } from "@skeletonlabs/skeleton";
  // import { editor, blocks } from "../store";
  import { useEditor } from "../context";

  const { testing, blocks } = useEditor();

  const modalStore = getModalStore();
  const drawerStore = getDrawerStore();

  const invalidModal = {
    type: "alert",
    title: "Error",
    buttonTextCancel: "Ok",
    body: "To test a level you need a starting and an ending block",
  };

  const settingsModal = {
    type: "component",
    component: "editorSettingsModal",
  };

  const menuDrawer = {
    id: "menu-drawer",
    position: "right",
    width: "w-64",
  };

  $: valid =
    $blocks.filter((b) => b.type === "start" || b.type === "end").length === 2;
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
      <div class="flex gap-8">
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
          on:click={() => drawerStore.open(menuDrawer)}
        >
          <img src="/editor/menu.svg" alt="Menu" />
        </button>
      </div>
    {/if}
  </svelte:fragment>
</AppBar>
