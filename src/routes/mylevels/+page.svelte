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
    const usedInCampaign = levels.find(l => l.isCampaign && l.sourceLevelIds?.includes(levelId));
    if (usedInCampaign) {
      alert(`Cannot delete this level because it is currently used in the campaign: "${usedInCampaign.name}".`);
      return;
    }

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

<div class="w-screen h-screen overflow-y-auto bg-[#C4E9CC] flex flex-col relative overflow-x-hidden">
  <!-- Background decorative glowing orbs -->
  <div class="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
    <div class="absolute -top-32 -left-32 w-96 h-96 bg-white/20 rounded-full blur-[100px]"></div>
    <div class="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-white/20 rounded-full blur-[120px]"></div>
  </div>

  <div class="container h-full mx-auto flex flex-col gap-8 p-10 z-10">
    <div class="w-full flex justify-between items-center bg-white/50 backdrop-blur-lg border border-white/60 shadow-xl rounded-full px-8 py-4">
      <button 
        class="py-2 px-6 rounded-full font-bold tracking-wider bg-[#4A4A4A] hover:bg-[#333333] border-2 border-white shadow-md text-white hover:scale-[1.05] active:scale-95 transition-all cursor-pointer" 
        on:click={() => goto("/")}
      >
        Back
      </button>
      <h1 class="text-3xl font-black tracking-widest text-[#4A4A4A] drop-shadow-sm">MY LEVELS</h1>
      <button 
        class="py-2 px-6 rounded-full font-bold tracking-wider bg-[#F6A655] hover:bg-[#E57300] border-2 border-white shadow-md text-white hover:scale-[1.05] active:scale-95 transition-all cursor-pointer" 
        on:click={() => goto("/campaign/builder")}
      >
        Bundle Campaign
      </button>
    </div>
  {#if loading}
    <p>Loading...</p>
  {:else if levels.length === 0}
    <p>You haven't saved any levels yet.</p>
  {:else}
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {#each levels as level}
        <div class="bg-white/50 backdrop-blur-md border border-white/60 shadow-xl rounded-3xl overflow-hidden flex flex-col hover:-translate-y-2 hover:shadow-2xl transition-all duration-300">
          <header class="relative">
            {#if level.thumbnailUrl}
              <img src={level.thumbnailUrl} class="bg-black/50 w-full aspect-video object-cover" alt="thumbnail" />
            {:else}
              <div class="bg-surface-800 w-full aspect-video flex items-center justify-center text-surface-500 font-bold">
                No Image
              </div>
            {/if}
          </header>
          <div class="p-6 space-y-2 flex-grow text-[#4A4A4A]">
            <h3 class="text-2xl font-black tracking-wide flex items-center gap-2" data-toc-ignore>
              {level.name}
              {#if level.isCampaign || (level.holes && level.holes.length > 1)}
                <span class="px-3 py-1 bg-[#4A4A4A] text-white text-xs font-bold rounded-full">{level.holes?.length || 0} Holes</span>
              {/if}
            </h3>
            <p class="text-sm font-bold opacity-60 text-[#4A4A4A] mt-0.5 mb-2">By {level.author || "Unknown Player"}</p>
            {#if !level.isCampaign}
              <p class="font-bold opacity-75">Par: {level.par || (level.holes && level.holes[0]?.par) || "?"}</p>
            {:else}
              <p class="font-bold text-[#F6A655]">Campaign</p>
            {/if}
          </div>
          <hr class="border-white/50" />
          <footer class="p-6 flex justify-between items-center bg-white/20">
            <button 
              class="py-2 px-4 rounded-full font-bold text-sm tracking-wider bg-red-400 hover:bg-red-500 border border-white/50 shadow-sm text-white hover:scale-105 active:scale-95 transition-all cursor-pointer" 
              on:click={() => handleDelete(level.id, level.name)}
            >
              Delete
            </button>
            <div class="flex space-x-3">
              {#if !level.isCampaign}
                <button 
                  class="py-2 px-5 rounded-full font-bold tracking-wider bg-[#4A4A4A] hover:bg-[#333333] border-2 border-white shadow-md text-white hover:scale-105 active:scale-95 transition-all cursor-pointer" 
                  on:click={() => goto(`/editor?courseId=${level.id}`)}
                >
                  Edit
                </button>
              {/if}
              <button 
                class="py-2 px-6 rounded-full font-black tracking-widest bg-gradient-to-b from-[#F6A655] to-[#E57300] border-2 border-white/50 shadow-lg text-white hover:scale-105 active:scale-95 transition-all cursor-pointer" 
                on:click={() => goto(`/game?courseId=${level.id}`)}
              >
                PLAY
              </button>
            </div>
          </footer>
        </div>
      {/each}
    </div>
  {/if}
  </div>
</div>
