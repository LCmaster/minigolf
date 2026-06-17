<script>
  import { Canvas } from "@threlte/core";
  import { Environment } from "@threlte/extras";
  import { World } from "@threlte/rapier";
  import { AppShell } from "@skeletonlabs/skeleton";
  import EditorScene from "./components/EditorScene.svelte";
  import TestScene from "./components/TestScene.svelte";
  import Header from "./components/Header.svelte";
  import AssetProperties from "./components/AssetProperties.svelte";

  import { setEditor } from "./context";
  let { testing, controlPoints, stage } = setEditor();

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
