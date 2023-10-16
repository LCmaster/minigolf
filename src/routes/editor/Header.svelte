<script>
  import { AppBar } from "@skeletonlabs/skeleton";
  import { getModalStore } from "@skeletonlabs/skeleton";
  import { editor, blocks } from "./store";

  const modalStore = getModalStore();
  const invalidModal = {
    type: "alert",
    title: "Error",
    buttonTextCancel: "Ok",
    body: "To test a level you need a starting and an ending block",
  };

  function isValid() {
    const validBlocks = $blocks.filter(
      (b) => b.type === "start" || b.type === "end"
    );
    return validBlocks.length === 2;
  }
</script>

<AppBar background={"variant-filled"} gridColumns="grid-cols-[1fr_auto]">
  <h1>
    <strong class="uppercase text-lg">minigolfmania</strong>
    <span class="font-thin italic text-sm">Editor</span>
  </h1>
  <svelte:fragment slot="trail">
    {#if $editor.testing}
      <button
        type="button"
        class="btn-icon btn-icon-sm variant-filled"
        on:click={() => {
          $editor.testing = false;
        }}
      >
        <img src="/editor/close.svg" alt="Close" />
      </button>
    {:else}
      <button
        type="button"
        class="btn-icon btn-icon-sm variant-filled"
        disabled={!isValid()}
        on:click={() => {
          if (isValid()) {
            $editor.testing = true;
          } else {
            modalStore.trigger(invalidModal);
          }
        }}
      >
        <img src="/editor/play.svg" alt="Play" />
      </button>
    {/if}
  </svelte:fragment>
</AppBar>
