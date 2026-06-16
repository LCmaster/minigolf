<script>
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";

  import { onMount } from "svelte";
  import { auth } from "$lib/firebase";
  import { onAuthStateChanged } from "firebase/auth";
  import { user } from "$lib/authStore";

  import { Modal, initializeStores } from "@skeletonlabs/skeleton";
  import EditorSettingsModal from "./editor/components/EditorSettingsModal.svelte";

  import "../app.postcss";

  inject({ mode: dev ? "development" : "production" });
  initializeStores();

  const modalRegistry = {
    editorSettings: { ref: EditorSettingsModal },
  };

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      $user = firebaseUser;
    });

    return () => unsubscribe();
  });
</script>

<Modal components={modalRegistry} />
<slot />
