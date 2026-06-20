<script>
  import { Canvas } from "@threlte/core";
  import { Environment } from "@threlte/extras";
  import { World, Debug } from "@threlte/rapier";
  import { AppShell } from "@skeletonlabs/skeleton";
  import EditorScene from "./components/EditorScene.svelte";
  import TestScene from "./components/TestScene.svelte";
  import PreviewScene from "./components/PreviewScene.svelte";
  import Header from "./components/Header.svelte";
  import HierarchyPanel from "./components/HierarchyPanel.svelte";
  import InspectorPanel from "./components/InspectorPanel.svelte";

  import { setEditor } from "./context";
  let { testing, previewing, controlPoints, stage } = setEditor();

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
    } else if (e.key === "Escape") {
      // Escape exits preview or test mode
      if ($previewing) previewing.set(false);
      if ($testing) testing.set(false);
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<AppShell regionPage="relative" slotPageHeader="sticky top-0 z-10">
  <svelte:fragment slot="header">
    <Header />
  </svelte:fragment>
  <svelte:fragment slot="sidebarLeft">
    {#if !$testing && !$previewing}
      <HierarchyPanel />
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="sidebarRight">
    {#if !$testing && !$previewing}
      <InspectorPanel />
    {/if}
  </svelte:fragment>
  <Canvas rendererParameters={{ preserveDrawingBuffer: true }}>
    <World gravity={[0, -15, 0]}>
      {#if $testing}
        <TestScene on:completed={() => ($testing = false)} />
      {:else if $previewing}
        <Environment
          path={`/skybox/${$stage.skybox}/`}
          files={["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]}
          isBackground={true}
        />
        <PreviewScene />
      {:else}
        <Environment
          path={`/skybox/${$stage.skybox}/`}
          files={["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]}
          isBackground={true}
        />
        <EditorScene />
      {/if}
    </World>
  </Canvas>
</AppShell>
