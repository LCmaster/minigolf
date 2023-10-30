<script>
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";

  import { Modal, initializeStores } from "@skeletonlabs/skeleton";
  import EditorSettingsModal from "./editor/components/EditorSettingsModal.svelte";

  import "../app.postcss";

  inject({ mode: dev ? "development" : "production" });
  initializeStores();

  const modalRegistry = {
    editorSettings: { ref: EditorSettingsModal },
  };

  export let data;
</script>

<Modal components={modalRegistry} />
<slot />
