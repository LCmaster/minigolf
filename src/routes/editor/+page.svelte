<script>
  import JSZip from "jszip";
  import { saveAs } from "file-saver";

  import { T, Canvas } from "@threlte/core";
  import { World } from "@threlte/rapier";
  import { Environment } from "@threlte/extras";
  import {
    AppShell,
    getModalStore,
    getDrawerStore,
  } from "@skeletonlabs/skeleton";
  import EditorScene from "./components/EditorScene.svelte";
  import TestScene from "./components/TestScene.svelte";
  import AssetsList from "./components/AssetsList.svelte";
  import AssetProperties from "./components/AssetProperties.svelte";
  import Header from "./components/Header.svelte";

  import { setEditor } from "./context";
  import { saveLevel } from "$lib/firestore";
  import { user } from "$lib/authStore";
  import { goto } from "$app/navigation";
  import { CourseBuilder } from "$lib/CourseBuilder";

  const modalStore = getModalStore();
  const drawerStore = getDrawerStore();

  export let data;
  let { testing, controlPoints, pointSelected, stage } = setEditor();

  function handleKeydown(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
      e.preventDefault();
      controlPoints.undo();
    } else if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "y" || (e.shiftKey && e.key === "z"))
    ) {
      e.preventDefault();
      controlPoints.redo();
    }
  }

  const assetsDrawerSettings = {
    id: "assets-list",
  };

  const settingsModal = {
    type: "component",
    component: "editorSettings",
  };
</script>

<svelte:window on:keydown={handleKeydown} />

<AppShell regionPage="relative" slotPageHeader="sticky top-0 z-10">
  <svelte:fragment slot="header">
    <Header />
  </svelte:fragment>
  <svelte:fragment slot="sidebarLeft">
    {#if !$testing}
      <AssetProperties />
    {/if}
  </svelte:fragment>
  <Canvas rendererParameters={{ preserveDrawingBuffer: true }}>
    <World gravity={[0, -15, 0]}>
      <Environment
        path={`/skybox/${$stage.skybox}/`}
        files={["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]}
        isBackground={true}
      />

      {#if $testing}
        <TestScene on:completed={() => ($testing = false)} />
      {:else}
        <EditorScene />
      {/if}
    </World>
  </Canvas>
</AppShell>
