<script>
  import JSZip from "jszip";
  import { saveAs } from "file-saver";
  import { getModalStore, getDrawerStore } from "@skeletonlabs/skeleton";
  import { goto } from "$app/navigation";
  import { saveLevel } from "$lib/firestore";
  import { user } from "$lib/authStore";
  import { useEditor } from "../context";

  const { stage } = useEditor();
  const drawerStore = getDrawerStore();
  const modalStore = getModalStore();

  const settingsModal = {
    type: "component",
    component: "editorSettings",
  };
</script>

{#if $drawerStore.id === "menu-drawer"}
  <nav class="p-4 h-full">
    <ul class="flex flex-col gap-4">
      <li>
        <button
          class="text-2xl w-full text-left"
          on:click={() => {
            drawerStore.close();
            modalStore.trigger({
              ...settingsModal,
              meta: { stage: $stage },
              response: (r) => {
                if (r) {
                  $stage.name = r.name;
                  $stage.par = parseInt(r.par);
                  $stage.skybox = r.skybox;
                  $stage.groundFriction = parseFloat(r.groundFriction);
                  $stage.groundRestitution = parseFloat(r.groundRestitution);
                  $stage.wallFriction = parseFloat(r.wallFriction);
                  $stage.wallRestitution = parseFloat(r.wallRestitution);
                }
              },
            });
          }}>Settings</button
        >
      </li>
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
              await saveLevel($user.uid, $stage, $controlPoints, thumbnailDataUrl);
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
