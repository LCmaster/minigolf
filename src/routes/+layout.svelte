<script>
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";

  import { invalidate } from "$app/navigation";
  import { onMount } from "svelte";

  import { Modal, initializeStores } from "@skeletonlabs/skeleton";
  import EditorSettingsModal from "./editor/components/EditorSettingsModal.svelte";

  import "../app.postcss";

  inject({ mode: dev ? "development" : "production" });
  initializeStores();

  const modalRegistry = {
    editorSettings: { ref: EditorSettingsModal },
  };

  export let data;

  let { supabase, session } = data;
  $: ({ supabase, session } = data);

  onMount(() => {
    const { data } = supabase.auth.onAuthStateChange((event, _session) => {
      if (_session?.expires_at !== session?.expires_at) {
        invalidate("supabase:auth");
      }
    });

    return () => data.subscription.unsubscribe();
  });
</script>

<Modal components={modalRegistry} />
<slot />
