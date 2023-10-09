<script>
  import { dev } from "$app/environment";
  import { inject } from "@vercel/analytics";
  import "../app.postcss";

  inject({ mode: dev ? "development" : "production" });
</script>

<slot />
