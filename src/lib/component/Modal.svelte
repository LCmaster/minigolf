<script>
  import { createEventDispatcher } from "svelte";

  export let closeable = true;

  const dispatch = createEventDispatcher();
</script>

<button class="fixed top-0 left-0 w-screen h-screen" />
<div class="">
  <h2><slot name="title" /></h2>
  <slot />
  <div>
    <slot name="actions" />
  </div>
</div>
