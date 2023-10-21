<script>
  import JSZip from "jszip";
  import { saveAs } from "file-saver";

  import { T, Canvas } from "@threlte/core";
  import { World } from "@threlte/rapier";
  import { Environment } from "@threlte/extras";
  import {
    AppShell,
    getModalStore,
    Drawer,
    getDrawerStore,
  } from "@skeletonlabs/skeleton";
  import EditorScene from "./components/EditorScene.svelte";
  import TestScene from "./components/TestScene.svelte";
  import AssetsList from "./components/AssetsList.svelte";
  import AssetProperties from "./components/AssetProperties.svelte";
  import Header from "./components/Header.svelte";

  import { setEditor } from "./context";

  const modalStore = getModalStore();
  const drawerStore = getDrawerStore();

  export let data;
  let { testing, blocks, slotSelected, blockSelected, stage } = setEditor();

  const assetsDrawerSettings = {
    id: "assets-list",
  };

  const settingsModal = {
    type: "component",
    component: "editorSettings",
  };
</script>

<Drawer>
  {#if $drawerStore.id === "assets-list"}
    <AssetsList
      types={data.types}
      blocks={data.blocks}
      bind:selected={blockSelected}
      on:assetSelected={(ev) => {
        const block = ev.detail;
        const id = crypto.randomUUID();
        $blocks = [
          ...$blocks,
          {
            id,
            ...block,
            position: $slotSelected,
            rotation: 0,
          },
        ];
        $blockSelected = id;
        $slotSelected = null;
        drawerStore.close();
      }}
    />
  {:else if $drawerStore.id === "menu-drawer"}
    <nav class="p-4">
      <ul>
        <!-- <li>
          <button
            class="text-2xl"
            on:click={() => {
              modalStore.trigger(settingsModal);
            }}>Settings</button
          >
        </li> -->
        <li>
          <button
            class="text-2xl"
            on:click={() => {
              const zip = new JSZip();
              zip.file(
                "config.json",
                JSON.stringify({
                  blocks: [...$blocks],
                })
              );
              zip
                .generateAsync({ type: "blob" })
                .then((content) => saveAs(content, "stage.zip"));
            }}>Export</button
          >
        </li>
      </ul>
    </nav>
  {/if}
</Drawer>
<AppShell regionPage="relative" slotPageHeader="sticky top-0 z-10">
  <svelte:fragment slot="header">
    <Header />
  </svelte:fragment>
  <svelte:fragment slot="sidebarRight">
    {#if !$testing}
      <AssetProperties />
    {/if}
  </svelte:fragment>
  <Canvas>
    <World gravity={[0, -15, 0]}>
      <Environment
        path={`/skybox/${$stage.skybox}/`}
        files={["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]}
        isBackground={true}
      />

      {#if $testing}
        <TestScene on:completed={() => ($testing = false)} />
      {:else}
        <EditorScene
          on:slotSelected={(e) => {
            const { position } = e.detail;
            $slotSelected = position;
            drawerStore.open(assetsDrawerSettings);
          }}
        />
      {/if}
    </World>
  </Canvas>
</AppShell>
