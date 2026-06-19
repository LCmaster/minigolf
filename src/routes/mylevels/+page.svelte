<script>
  import { user, getMyLevels } from "$lib/firebase";
  import { goto } from "$app/navigation";

  let levels = [];
  let loading = true;

  $: if ($user !== undefined) {
    if ($user) {
      getMyLevels($user.uid).then(res => {
        levels = res;
        loading = false;
      });
    } else {
      loading = false;
      goto("/auth/signin");
    }
  }
</script>

<div class="container h-full mx-auto flex flex-col items-center gap-8 p-10">
  <div class="w-full flex justify-between items-center">
    <button class="btn variant-filled-surface" on:click={() => goto("/")}>Back</button>
    <h1 class="h1">My Levels</h1>
    <div class="w-20"></div> <!-- Spacer -->
  </div>
  
  {#if loading}
    <p>Loading...</p>
  {:else if levels.length === 0}
    <p>You haven't saved any levels yet.</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each levels as level}
        <div class="card card-hover overflow-hidden">
          <header>
            <img src={level.thumbnailUrl} class="bg-black/50 w-full aspect-video object-cover" alt="thumbnail" />
          </header>
          <div class="p-4 space-y-4">
            <h3 class="h3" data-toc-ignore>{level.name}</h3>
            <p>Par: {level.par}</p>
          </div>
          <hr class="opacity-50" />
          <footer class="p-4 flex justify-end space-x-2">
            <button class="btn variant-filled-primary" disabled>Play</button>
            <button class="btn variant-filled-surface" disabled>Edit</button>
          </footer>
        </div>
      {/each}
    </div>
  {/if}
</div>
