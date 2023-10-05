<script>
  export let data;
</script>

{#each data.posts as post}
  <h2>{post.title}</h2>
{/each}
