<script>
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { getCampaign, getLevel } from "$lib/level";

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
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {#each levels as level, i}
                <div class="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all text-[#4A4A4A] relative overflow-hidden">
                  <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#F6A655] to-[#E57300]"></div>
                  
                  <span class="w-10 h-10 rounded-full bg-white border border-[#4A4A4A]/20 flex items-center justify-center font-black text-xl text-[#F6A655] shadow-inner shrink-0 ml-2">
                    {i + 1}
                  </span>
                  
                  {#if level.thumbnailUrl}
                    <img src={level.thumbnailUrl} alt="thumbnail" class="w-16 h-12 object-cover rounded-xl shadow-inner shrink-0" />
                  {/if}
                  
                  <div class="flex-grow">
                    <h4 class="font-bold text-lg leading-tight">{level.name}</h4>
                    <span class="text-xs font-bold opacity-75">Par: {level.par || (level.holes && level.holes[0]?.par) || 2}</span>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
