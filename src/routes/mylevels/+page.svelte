<script>
  import { user, getMyLevels, deleteLevel } from "$lib/firebase";
  import { goto } from "$app/navigation";

  let levels = [];
  let loading = true;

  $: if ($user !== undefined) {
    if ($user) {
      getMyLevels($user.uid).then(res => {
        levels = res.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        loading = false;
      }).catch(err => {
        console.error("Failed to fetch levels:", err);
        loading = false;
        alert("Could not load levels. Please try again later.");
      });
    } else {
      loading = false;
      goto("/auth/signin");
    }
  }

  async function handleDelete(levelId, levelName) {
    if (confirm(`Are you sure you want to delete "${levelName}"? This cannot be undone.`)) {
      try {
        await deleteLevel(levelId);
        levels = levels.filter(l => l.id !== levelId);
      } catch (e) {
        console.error(e);
        alert("Failed to delete level.");
      }
    }
  }
</script>

<div class="container h-full mx-auto flex flex-col items-center gap-8 p-10">
  <div class="w-full flex justify-between items-center">
    <button class="btn variant-filled-surface" on:click={() => goto("/")}>Back</button>
    <h1 class="h1">My Levels</h1>
    <button class="btn variant-filled-secondary" on:click={() => goto("/campaign/builder")}>Bundle Campaign</button>
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
            {#if level.thumbnailUrl}
              <img src={level.thumbnailUrl} class="bg-black/50 w-full aspect-video object-cover" alt="thumbnail" />
            {:else}
              <div class="bg-surface-800 w-full aspect-video flex items-center justify-center text-surface-500 font-bold">
                No Image
              </div>
            {/if}
          </header>
          <div class="p-4 space-y-4">
            <h3 class="h3" data-toc-ignore>
              {level.name}
              {#if level.isCampaign || (level.holes && level.holes.length > 1)}
                <span class="badge variant-filled-secondary ml-2">{level.holes?.length || 0} Holes</span>
              {/if}
            </h3>
            {#if !level.isCampaign}
              <p>Par: {level.par || (level.holes && level.holes[0]?.par) || "?"}</p>
            {:else}
              <p>Campaign</p>
            {/if}
          </div>
          <hr class="opacity-50" />
          <footer class="p-4 flex justify-between items-center">
            <button class="btn btn-sm variant-filled-error" on:click={() => handleDelete(level.id, level.name)}>Delete</button>
            <div class="flex space-x-2">
              <button class="btn variant-filled-primary" on:click={() => goto(`/game?courseId=${level.id}`)}>Play</button>
              {#if !level.isCampaign}
                <button class="btn variant-filled-surface" on:click={() => goto(`/editor?courseId=${level.id}`)}>Edit</button>
              {/if}
            </div>
          </footer>
        </div>
      {/each}
    </div>
  {/if}
</div>
