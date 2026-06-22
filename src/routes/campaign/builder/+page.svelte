<script>
  import { user, getMyLevels, saveCampaign } from "$lib/firebase";
  import { goto } from "$app/navigation";
  import { themeOptions } from "$lib/scene/themes";

  let levels = [];
  let playlist = [];
  let loading = true;
  let saving = false;

  let campaignName = "";
  let campaignTheme = "clear";

  $: if ($user !== undefined) {
    if ($user) {
      getMyLevels($user.uid).then((res) => {
        // Filter out existing campaigns so you can only bundle base levels
        levels = res.filter((l) => !l.isCampaign);
        loading = false;
      });
    } else {
      loading = false;
      goto("/auth/signin");
    }
  }

  function addToPlaylist(level) {
    playlist = [...playlist, { ...level, playlistId: crypto.randomUUID() }];
  }

  function removeFromPlaylist(index) {
    playlist = playlist.filter((_, i) => i !== index);
  }

  function moveUp(index) {
    if (index === 0) return;
    const newPlaylist = [...playlist];
    [newPlaylist[index - 1], newPlaylist[index]] = [newPlaylist[index], newPlaylist[index - 1]];
    playlist = newPlaylist;
  }

  function moveDown(index) {
    if (index === playlist.length - 1) return;
    const newPlaylist = [...playlist];
    [newPlaylist[index + 1], newPlaylist[index]] = [newPlaylist[index], newPlaylist[index + 1]];
    playlist = newPlaylist;
  }

  async function handleSave() {
    if (!$user) return;
    if (playlist.length === 0) {
      alert("Please add at least one level to the campaign.");
      return;
    }
    if (!campaignName) {
      alert("Please enter a campaign name.");
      return;
    }

    saving = true;
    try {
      // Merge all holes from the playlist
      const mergedHoles = playlist.flatMap(level => level.holes);
      const thumbnailUrl = playlist[0].thumbnailUrl; // Inherit first level's thumbnail

      await saveCampaign(
        $user.uid,
        campaignName,
        campaignTheme,
        thumbnailUrl,
        mergedHoles
      );

      alert("Campaign saved successfully!");
      goto("/mylevels");
    } catch (e) {
      console.error(e);
      alert("Failed to save campaign.");
    } finally {
      saving = false;
    }
  }
</script>

<div class="container h-full mx-auto flex flex-col gap-8 p-10">
  <div class="w-full flex justify-between items-center">
    <button class="btn variant-filled-surface" on:click={() => goto("/mylevels")}>Back</button>
    <h1 class="h1">Campaign Builder</h1>
    <button 
      class="btn variant-filled-primary" 
      disabled={saving || playlist.length === 0 || !campaignName} 
      on:click={handleSave}
    >
      {saving ? "Saving..." : "Save Campaign"}
    </button>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
    <!-- Left Column: Available Levels -->
    <div class="card p-4 flex flex-col gap-4 bg-surface-800">
      <h2 class="h2">Your Base Levels</h2>
      <p class="opacity-75">Select single-hole levels to add to your campaign.</p>
      
      {#if loading}
        <p>Loading...</p>
      {:else if levels.length === 0}
        <p>You haven't created any single-hole levels yet.</p>
      {:else}
        <div class="flex flex-col gap-2 overflow-y-auto max-h-[60vh] pr-2">
          {#each levels as level}
            <div class="card p-3 flex justify-between items-center bg-surface-700">
              <div class="flex items-center gap-4">
                {#if level.thumbnailUrl}
                  <img src={level.thumbnailUrl} alt="thumbnail" class="w-16 h-12 object-cover rounded" />
                {/if}
                <div>
                  <h4 class="h4">{level.name}</h4>
                  <span class="text-xs opacity-75">Par: {level.par || (level.holes && level.holes[0]?.par)}</span>
                </div>
              </div>
              <button class="btn btn-sm variant-filled-secondary" on:click={() => addToPlaylist(level)}>+</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Right Column: Playlist & Settings -->
    <div class="card p-4 flex flex-col gap-4 bg-surface-800">
      <h2 class="h2">Campaign Playlist</h2>
      
      <div class="flex flex-col gap-4 p-4 bg-surface-900 rounded-lg">
        <label class="label">
          <span>Campaign Name</span>
          <input class="input" type="text" placeholder="e.g. The Desert Classic 18" bind:value={campaignName} />
        </label>
        <label class="label">
          <span>Campaign Theme</span>
          <select class="select" bind:value={campaignTheme}>
            {#each themeOptions as opt}
              <option value={opt.id}>{opt.name}</option>
            {/each}
          </select>
        </label>
      </div>

      <div class="flex flex-col gap-2 overflow-y-auto max-h-[45vh] pr-2">
        {#if playlist.length === 0}
          <div class="p-8 text-center opacity-50 border-2 border-dashed border-surface-500 rounded-lg">
            Playlist is empty. Add levels from the left panel.
          </div>
        {:else}
          {#each playlist as item, i (item.playlistId)}
            <div class="card p-3 flex justify-between items-center bg-surface-700 border-l-4 border-primary-500">
              <div class="flex items-center gap-4">
                <span class="badge variant-filled-surface w-8 h-8 flex items-center justify-center font-bold text-lg">{i + 1}</span>
                <div>
                  <h4 class="h4">{item.name}</h4>
                </div>
              </div>
              <div class="flex gap-1">
                <button class="btn-icon btn-icon-sm variant-filled-surface" disabled={i === 0} on:click={() => moveUp(i)}>↑</button>
                <button class="btn-icon btn-icon-sm variant-filled-surface" disabled={i === playlist.length - 1} on:click={() => moveDown(i)}>↓</button>
                <button class="btn-icon btn-icon-sm variant-filled-error ml-2" on:click={() => removeFromPlaylist(i)}>✕</button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</div>
