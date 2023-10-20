<script>
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";
  import { Modal, initializeStores } from "@skeletonlabs/skeleton";
  import "../app.postcss";
  import EditorSettingsModal from "./editor/components/EditorSettingsModal.svelte";

  inject({ mode: dev ? "development" : "production" });
  initializeStores();

  const modalRegistry = {
    editorSettings: { ref: EditorSettingsModal },
  };
</script>

<Modal components={modalRegistry} />
<slot />
