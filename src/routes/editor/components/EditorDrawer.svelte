<script>
  import JSZip from "jszip";
  import { saveAs } from "file-saver";
  import { getModalStore, getDrawerStore } from "@skeletonlabs/skeleton";
  import { goto } from "$app/navigation";
  import { saveLevel, user } from "$lib/firebase";
  import { getContext } from "svelte";
  import { writable } from "svelte/store";

  // EditorDrawer is mounted in the root layout (outside the editor page),
  // so the editor context may not exist. Use safe fallbacks to avoid
  // breaking Svelte's reactivity graph when context is absent.
  const editorCtx = getContext("minigolfmania/editor/context");
  const stage = editorCtx?.stage ?? writable({});
  const controlPoints = editorCtx?.controlPoints ?? writable([]);

  const drawerStore = getDrawerStore();
  const modalStore = getModalStore();
</script>

{#if $drawerStore.id === "menu-drawer"}
  <nav class="p-4 h-full">
    <ul class="flex flex-col gap-4">

      <li>
        <button
          class="text-2xl w-full text-left"
          on:click={async () => {
            if (!$user) {
              alert("You must be logged in to save.");
              return;
            }
            try {
              const canvas = document.querySelector("canvas");
              const thumbnailDataUrl = canvas.toDataURL("image/png");
              await saveLevel(
                $user.uid,
                $stage,
                $controlPoints,
                thumbnailDataUrl,
              );
              alert("Level saved successfully!");
              drawerStore.close();
            } catch (e) {
              console.error(e);
              alert("Failed to save level.");
            }
          }}>Save to Cloud</button
        >
      </li>
      <li>
        <button
          class="text-2xl w-full text-left"
          on:click={() => {
            const zip = new JSZip();
            zip.file(
              "config.json",
              JSON.stringify({ controlPoints: [...$controlPoints] }),
            );
            zip
              .generateAsync({ type: "blob" })
              .then((content) => saveAs(content, "stage.zip"));
          }}>Export</button
        >
      </li>
      <hr class="opacity-50" />
      <li>
        <button
          class="text-2xl w-full text-left text-error-500"
          on:click={() => {
            drawerStore.close();
            goto("/");
          }}>Exit Editor</button
        >
      </li>
    </ul>
  </nav>
{/if}
