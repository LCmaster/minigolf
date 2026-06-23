<script>
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { getLevel } from "$lib/level";
  import { getCampaign, unbundleLevelFromCampaign } from "$lib/campaign";
  import { user } from "$lib/user";
  import { userProfile, canEditLevels } from "$lib/stores/profile";

  $: if ($userProfile && !$canEditLevels) goto("/");

  const campaignId = $page.params.id;
  let campaign = null;
  let levels = [];
  let loading = true;
  let error = null;

  getCampaign(campaignId).then(async (data) => {
    campaign = data;
    if (campaign.levelIds && campaign.levelIds.length > 0) {
      const promises = campaign.levelIds.map(id => getLevel(id).catch(e => null));
      const res = await Promise.all(promises);
      levels = res.filter(Boolean);
    }
    loading = false;
  }).catch(e => {
    console.error(e);
    error = "Failed to load campaign.";
    loading = false;
  });

  async function unbundleLevel(level) {
    if (!confirm(`Are you sure you want to remove '${level.name}' from this campaign?`)) return;
    
    try {
      loading = true;
      await unbundleLevelFromCampaign(campaignId, level.id);
      levels = levels.filter(l => l.id !== level.id);
    } catch (e) {
      console.error(e);
      alert("Failed to unbundle level.");
    } finally {
      loading = false;
    }
  }
</script>

<div class="w-screen h-screen overflow-y-auto bg-[#C4E9CC] flex flex-col relative overflow-x-hidden">
  <div class="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
    <div class="absolute -top-32 -left-32 w-96 h-96 bg-white/20 rounded-full blur-[100px]"></div>
    <div class="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-white/20 rounded-full blur-[120px]"></div>
  </div>

  <div class="container h-full mx-auto flex flex-col gap-8 p-10 z-10">
    <div class="w-full flex justify-between items-center bg-white/50 backdrop-blur-lg border border-white/60 shadow-xl rounded-full px-8 py-4">
      <button 
        class="py-2 px-6 rounded-full font-bold tracking-wider bg-[#4A4A4A] hover:bg-[#333333] border-2 border-white shadow-md text-white hover:scale-[1.05] active:scale-95 transition-all cursor-pointer" 
        on:click={() => history.back()}
      >
        Back
      </button>
      <h1 class="text-3xl font-black tracking-widest text-[#4A4A4A] drop-shadow-sm uppercase">
        {campaign ? campaign.name : "CAMPAIGN"}
      </h1>
      <button 
        class="py-2 px-6 rounded-full font-black tracking-widest bg-gradient-to-b from-[#F6A655] to-[#E57300] border-2 border-white/50 shadow-lg text-white hover:scale-[1.05] active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:scale-100"
        disabled={loading || error || levels.length === 0}
        on:click={() => goto(`/game?campaignId=${campaignId}`)}
      >
        PLAY CAMPAIGN
      </button>
    </div>

    {#if loading}
      <p class="text-xl font-bold text-[#4A4A4A]">Loading campaign...</p>
    {:else if error}
      <p class="text-xl font-bold text-red-500">{error}</p>
    {:else}
      <div class="flex flex-col md:flex-row gap-8">
        <!-- Campaign Details -->
        <div class="w-full md:w-1/3 flex flex-col gap-6">
          <div class="bg-white/50 backdrop-blur-md border border-white/60 shadow-xl rounded-3xl overflow-hidden flex flex-col p-6 text-[#4A4A4A]">
            {#if campaign.thumbnailUrl}
              <img src={campaign.thumbnailUrl} alt="Thumbnail" class="w-full aspect-video object-cover rounded-xl shadow-inner mb-4" />
            {/if}
            <h2 class="text-2xl font-black tracking-wide">{campaign.name}</h2>
            <p class="font-bold opacity-75 mt-1">By {campaign.author}</p>
            <div class="mt-4 flex flex-col gap-2 font-bold text-sm">
              <div class="flex justify-between bg-white/40 p-3 rounded-xl border border-white/50">
                <span>Difficulty</span>
                <span class="text-[#F6A655]">{campaign.difficulty || "Normal"}</span>
              </div>
              <div class="flex justify-between bg-white/40 p-3 rounded-xl border border-white/50">
                <span>Theme</span>
                <span class="capitalize">{campaign.theme || "Clear"}</span>
              </div>
              <div class="flex justify-between bg-white/40 p-3 rounded-xl border border-white/50">
                <span>Total Holes</span>
                <span>{levels.length}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Levels List -->
        <div class="w-full md:w-2/3 flex flex-col gap-4">
          <h3 class="text-2xl font-black tracking-widest text-[#4A4A4A] drop-shadow-sm mb-2">LEVELS INCLUDED</h3>
          {#if levels.length === 0}
            <div class="bg-white/50 backdrop-blur-md border border-white/60 shadow-xl rounded-3xl p-8 text-center font-bold text-[#4A4A4A]">
              This campaign has no valid levels.
            </div>
          {:else}
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
              {#each levels as level, i}
                <div class="bg-white/50 backdrop-blur-md border border-white/60 shadow-xl rounded-3xl overflow-hidden flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 relative">
                  <!-- Number Badge -->
                  <div class="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur border border-[#4A4A4A]/20 flex items-center justify-center font-black text-xl text-[#F6A655] shadow-md z-10">
                    {i + 1}
                  </div>
                  <header class="relative">
                    {#if level.thumbnailUrl}
                      <img src={level.thumbnailUrl} class="bg-black/50 w-full aspect-video object-cover" alt="thumbnail" />
                    {:else}
                      <div class="bg-surface-800 w-full aspect-video flex items-center justify-center text-surface-500 font-bold">
                        No Image
                      </div>
                    {/if}
                  </header>
                  <div class="p-6 space-y-2 flex-grow text-[#4A4A4A] w-full bg-white/40">
                    <h3 class="text-xl font-black tracking-wide flex items-center gap-2" data-toc-ignore>
                      {level.name}
                    </h3>
                    <p class="text-sm font-bold opacity-60 text-[#4A4A4A] mt-0.5 mb-2">By {level.author || "Unknown Player"}</p>
                    <p class="font-bold opacity-75 text-sm">Par: {level.par || (level.holes && level.holes[0]?.par) || "?"}</p>
                  </div>
                  {#if $user && level.uid === $user.uid}
                    <hr class="border-white/50" />
                    <footer class="p-4 flex justify-end gap-2 items-center bg-white/20">
                      <button 
                        class="py-1.5 px-4 rounded-full font-bold text-sm tracking-wider bg-red-400 hover:bg-red-500 border border-white/50 shadow-sm text-white hover:scale-105 active:scale-95 transition-all cursor-pointer" 
                        on:click|stopPropagation={() => unbundleLevel(level)}
                      >
                        Unbundle
                      </button>
                      <button 
                        class="py-1.5 px-4 rounded-full font-bold text-sm tracking-wider bg-[#F6A655] hover:bg-[#E57300] border border-white/50 shadow-sm text-white hover:scale-105 active:scale-95 transition-all cursor-pointer" 
                        on:click|stopPropagation={() => goto(`/editor?courseId=${level.id}`)}
                      >
                        Edit
                      </button>
                      <button 
                        class="py-1.5 px-4 rounded-full font-bold text-sm tracking-wider bg-[#7ACC52] hover:bg-[#68B345] border border-white/50 shadow-sm text-white hover:scale-105 active:scale-95 transition-all cursor-pointer" 
                        on:click|stopPropagation={() => goto(`/game?courseId=${level.id}`)}
                      >
                        Play
                      </button>
                    </footer>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
