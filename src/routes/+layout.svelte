<script>
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";
  import {
    AppShell,
    AppBar,
    Modal,
    initializeStores,
  } from "@skeletonlabs/skeleton";
  import "../app.postcss";

  inject({ mode: dev ? "development" : "production" });
  initializeStores();

  const modalRegistry = {
    // Set a unique modal ID, then pass the component reference
  };
</script>

<Modal components={modalRegistry} />
<slot />
