<script>
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";

  import { onMount } from "svelte";
  import { auth } from "$lib/firebase";
  import { onAuthStateChanged } from "firebase/auth";
  import { user } from "$lib/authStore";

  import { Modal, Drawer, initializeStores } from "@skeletonlabs/skeleton";
  import EditorDrawer from "./editor/components/EditorDrawer.svelte";

  import "../app.postcss";

  inject({ mode: dev ? "development" : "production" });
  initializeStores();

  const modalRegistry = {};

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      $user = firebaseUser;
    });

    return () => unsubscribe();
  });
</script>

<Modal components={modalRegistry} />
<Drawer>
  <EditorDrawer />
</Drawer>
<slot />
