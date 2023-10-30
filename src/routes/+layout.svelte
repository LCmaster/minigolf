<script>
  import { dev } from "$app/environment";
  import { invalidate } from "$app/navigation";
  import { onMount } from "svelte";
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

  let { supabase, session } = data;
  $: ({ supabase, session } = data);

  onMount(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, _session) => {
      if (_session?.expires_at !== session?.expires_at) {
        invalidate("supabase:auth");
      }
    });

    return () => subscription.unsubscribe();
  });
</script>

<Modal components={modalRegistry} />
<slot />
