<script>
  import JSZip from "jszip";
  import { saveAs } from "file-saver";
  import { getModalStore, getDrawerStore } from "@skeletonlabs/skeleton";
  import { goto } from "$app/navigation";
  import { saveLevel, user } from "$lib/firebase";
  import { activeEditor } from "../context";
  import { get } from "svelte/store";

  // EditorDrawer is mounted in the root layout (outside the editor page),
  // so the editor context cannot be retrieved via getContext. We use the
  // globally exported activeEditor from context.js instead.

  const drawerStore = getDrawerStore();
  const modalStore = getModalStore();

  let fileInput;

  async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const configJson = await loadedZip.file("config.json").async("string");
      const courseData = JSON.parse(configJson);

      if (courseData.holes && courseData.holes.length > 0) {
        if (activeEditor.controlPoints) {
          activeEditor.controlPoints.commit();
        }
        activeEditor.controlPoints.set(courseData.holes[0].controlPoints);
        if (courseData.holes[0].blocks) {
          if (activeEditor.blocks) activeEditor.blocks.commit();
          activeEditor.blocks.set(courseData.holes[0].blocks);
        } else if (activeEditor.blocks) {
          activeEditor.blocks.set([]);
        }
        activeEditor.stage.set({
          name: courseData.name || "Untitled Level",
          skybox: courseData.skybox || "default",
          par: courseData.holes[0].par || 2,
        });
        alert("Level imported successfully!");
      } else if (courseData.controlPoints) {
        // Fallback for older exports that only had controlPoints
        if (activeEditor.controlPoints) {
          activeEditor.controlPoints.commit();
        }
        activeEditor.controlPoints.set(courseData.controlPoints);
        alert("Level imported successfully! (Old format)");
      } else {
        throw new Error("Invalid course data format.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to import level.");
    } finally {
      event.target.value = "";
      drawerStore.close();
    }
  }
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
              if (!activeEditor.stage) {
                alert("Editor context not loaded.");
                return;
              }
              const currentStage = get(activeEditor.stage);
              const currentCPs = get(activeEditor.controlPoints);
              const currentBlocks = activeEditor.blocks ? get(activeEditor.blocks) : [];

              const canvas = document.querySelector("canvas");
              const thumbnailDataUrl = canvas.toDataURL("image/png");
              await saveLevel(
                $user.uid,
                currentStage,
                currentCPs,
                thumbnailDataUrl,
                currentBlocks
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
            if (!activeEditor.stage) return;
            const currentStage = get(activeEditor.stage);
            const currentCPs = get(activeEditor.controlPoints);

            const zip = new JSZip();
            const courseData = {
              name: currentStage.name || "Untitled Level",
              skybox: currentStage.skybox || "default",
              difficulty: "Easy",
              holes: [
                {
                  par: currentStage.par || 2,
                  startShape: currentCPs[0]?.shape || "rounded",
                  endShape: currentCPs[currentCPs.length - 1]?.shape || "rounded",
                  controlPoints: [...currentCPs],
                  blocks: activeEditor.blocks ? [...get(activeEditor.blocks)] : [],
                },
              ],
            };
            zip.file("config.json", JSON.stringify(courseData));
            zip
              .generateAsync({ type: "blob" })
              .then((content) => saveAs(content, "stage.zip"));
          }}>Export</button
        >
      </li>
      <li>
        <input
          type="file"
          accept=".zip"
          style="display: none;"
          bind:this={fileInput}
          on:change={handleImport}
        />
        <button
          class="text-2xl w-full text-left"
          on:click={() => fileInput.click()}>Import</button
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
