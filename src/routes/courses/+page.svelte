<script>
  import { page } from "$app/stores";
  import CoursesHub from "$lib/components/courses/CoursesHub.svelte";
  import { resolveInitialHubTab } from "$lib/components/courses/CourseHubHelpers";

  $: initialTab = resolveInitialHubTab($page.url.searchParams);
</script>

<svelte:head>
  <title>Courses &amp; Tours | Mini Golf Mania</title>
</svelte:head>

<CoursesHub {initialTab} />
