<script>
  import JSZip from "jszip";
  import { saveAs } from "file-saver";
  import { getDrawerStore } from "@skeletonlabs/skeleton";
  import { goto } from "$app/navigation";
  import { saveLevel, updateLevel } from "$lib/level";
  import { user } from "$lib/user";
  import { activeEditor } from "../context";
  import { get } from "svelte/store";

  // EditorDrawer is mounted in the root layout (outside the editor page),
  // so the editor context cannot be retrieved via getContext. We use the
  // globally exported activeEditor from context.js instead.

  const drawerStore = getDrawerStore();

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
        const hole = courseData.holes[0];
        if (activeEditor.history) {
          activeEditor.history.commit();
          activeEditor.history.update((h) => ({
            ...h,
            controlPoints: hole.controlPoints || [],
            blocks: hole.blocks || [],
          }));
        }
        activeEditor.stage.update((s) => ({
          ...s,
          name: courseData.name || "Untitled Level",
          theme: courseData.theme || courseData.skybox || "clear",
          par: hole.par || 2,
          groundFriction: hole.groundFriction ?? 0.75,
          groundRestitution: hole.groundRestitution ?? 0.05,
          wallFriction: hole.wallFriction ?? 0.75,
          wallRestitution: hole.wallRestitution ?? 0.95,
          tileColor: hole.tileColor || "#567D46",
          terrainMode: hole.terrainMode || "heightmap",
        }));
        alert("Level imported successfully!");
      } else if (courseData.controlPoints) {
        // Fallback for older exports that only had controlPoints
        if (activeEditor.controlPoints) {
          activeEditor.controlPoints.commit();
          activeEditor.controlPoints.set(courseData.controlPoints);
        }
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
              
              // Compress the thumbnail down to a tiny 320x180 JPEG to fit in Firestore
              const destCanvas = document.createElement("canvas");
              destCanvas.width = 320;
              destCanvas.height = 180;
              const ctx = destCanvas.getContext("2d");
              ctx.drawImage(canvas, 0, 0, 320, 180);
              const thumbnailDataUrl = destCanvas.toDataURL("image/jpeg", 0.7);

              if (currentStage.id) {
                await updateLevel(
                  currentStage.id,
                  currentStage,
                  currentCPs,
                  thumbnailDataUrl,
                  currentBlocks
                );
              } else {
                const newId = await saveLevel(
                  $user.uid,
                  currentStage,
                  currentCPs,
                  thumbnailDataUrl,
                  currentBlocks
                );
                activeEditor.stage.update((s) => ({ ...s, id: newId }));
              }
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
              theme: currentStage.theme || "clear",
              difficulty: "Easy",
              holes: [
                {
                  par: currentStage.par || 2,
                  startShape: currentCPs[0]?.shape || "rounded",
                  endShape: currentCPs[currentCPs.length - 1]?.shape || "rounded",
                  groundFriction: currentStage.groundFriction ?? 0.75,
                  groundRestitution: currentStage.groundRestitution ?? 0.05,
                  wallFriction: currentStage.wallFriction ?? 0.75,
                  wallRestitution: currentStage.wallRestitution ?? 0.95,
                  tileColor: currentStage.tileColor || "#567D46",
                  terrainMode: currentStage.terrainMode || "heightmap",
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
