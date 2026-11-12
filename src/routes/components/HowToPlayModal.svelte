<script lang="ts">
  import type { SvelteComponent } from "svelte";
  import { getModalStore } from "@skeletonlabs/skeleton";
  import HowToPlayCard from "$lib/components/home/HowToPlayCard.svelte";

  export let parent: SvelteComponent;

  const modalStore = getModalStore();
</script>

<HowToPlayCard isOpen={Boolean($modalStore[0])} onClose={parent.onClose} />
