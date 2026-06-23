<script>
  import JSZip from "jszip";
  import { getMyLevels, getLevel } from "$lib/level";
  import { saveCampaign, updateCampaign, getCampaign } from "$lib/campaign";
  import { user } from "$lib/user";
  import { userProfile, canEditLevels } from "$lib/stores/profile";

  $: if ($userProfile && !$canEditLevels) goto("/");
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { themeOptions } from "$lib/scene/themes";

  let fileInput;

  let levels = [];
  let playlist = [];
  let loading = true;
  let saving = false;

  let campaignName = "";
  let campaignTheme = "clear";
  let campaignDifficulty = "Normal";
  let visibility = "private";
  let isOfficial = false;

  $: isAdmin = $userProfile?.role === 'super-admin' || $userProfile?.role === 'admin';

  let initialized = false;

  $: if ($user !== undefined && !initialized) {
    if ($user) {
      initialized = true;
      const campaignId = $page.url.searchParams.get("campaignId");
      getMyLevels($user.uid).then((res) => {
        // Only show levels not bundled or bundled in the current campaign
        levels = res.filter((l) => !l.isCampaign && (!l.campaignId || l.campaignId === campaignId));
        
        if (campaignId) {
          getCampaign(campaignId).then((campaign) => {
            campaignName = campaign.name;
            campaignTheme = campaign.theme;
            campaignDifficulty = campaign.difficulty || "Normal";
            visibility = campaign.visibility || "private";
            isOfficial = campaign.isOfficial || false;
            
            if (campaign.levelIds) {
              const promises = campaign.levelIds.map(id => getLevel(id).catch(e => null));
              Promise.all(promises).then(sourceLevels => {
                const newPlaylist = [];
                sourceLevels.forEach((sl, index) => {
                  if (sl) {
                    newPlaylist.push({ ...sl, playlistId: crypto.randomUUID() });
                  } else if (campaign.holes && campaign.holes[index]) {
                    newPlaylist.push({
                       name: "Unknown Level",
                       par: campaign.holes[index].par,
                       holes: [campaign.holes[index]],
                       playlistId: crypto.randomUUID()
                    });
                  }
                });
                playlist = newPlaylist;
                loading = false;
              });
            } else {
              loading = false;
            }
          }).catch(e => {
            console.error("Failed to load campaign", e);
            loading = false;
          });
        } else {
          loading = false;
        }
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
    [newPlaylist[index - 1], newPlaylist[index]] = [
      newPlaylist[index],
      newPlaylist[index - 1],
    ];
    playlist = newPlaylist;
  }

  function moveDown(index) {
    if (index === playlist.length - 1) return;
    const newPlaylist = [...playlist];
    [newPlaylist[index + 1], newPlaylist[index]] = [
      newPlaylist[index],
      newPlaylist[index + 1],
    ];
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
      const sourceLevelIds = playlist.map((level) => level.id);
      const thumbnailUrl = playlist[0].thumbnailUrl; // Inherit first level's thumbnail
      const totalPar = playlist.reduce((sum, level) => sum + (level.par || (level.holes && level.holes[0]?.par) || 0), 0);

      const campaignId = $page.url.searchParams.get("campaignId");
      if (campaignId) {
        await updateCampaign(
          campaignId,
          campaignName,
          campaignTheme,
          campaignDifficulty,
          thumbnailUrl,
          sourceLevelIds,
          visibility,
          isAdmin ? isOfficial : false,
          totalPar
        );
      } else {
        await saveCampaign(
          $user.uid,
          campaignName,
          campaignTheme,
          campaignDifficulty,
          thumbnailUrl,
          sourceLevelIds,
          visibility,
          isAdmin ? isOfficial : false,
          totalPar
        );
      }

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

<div
  class="w-screen h-screen overflow-y-auto bg-[#C4E9CC] flex flex-col relative overflow-x-hidden"
>
  <!-- Background decorative glowing orbs -->
  <div
    class="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none"
  >
    <div
      class="absolute -top-32 -left-32 w-96 h-96 bg-white/20 rounded-full blur-[100px]"
    ></div>
    <div
      class="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-white/20 rounded-full blur-[120px]"
    ></div>
  </div>

  <div class="container h-full mx-auto flex flex-col gap-8 p-10 z-10">
    <div
      class="w-full flex justify-between items-center bg-white/50 backdrop-blur-lg border border-white/60 shadow-xl rounded-full px-8 py-4"
    >
      <button
        class="py-2 px-6 rounded-full font-bold tracking-wider bg-[#4A4A4A] hover:bg-[#333333] border-2 border-white shadow-md text-white hover:scale-[1.05] active:scale-95 transition-all cursor-pointer"
        on:click={() => goto("/mylevels")}
      >
        Back
      </button>
      <h1
        class="text-3xl font-black tracking-widest text-[#4A4A4A] drop-shadow-sm"
      >
        CAMPAIGN BUILDER
      </h1>
      <button
        class="py-2 px-6 rounded-full font-black tracking-widest bg-gradient-to-b from-[#F6A655] to-[#E57300] border-2 border-white/50 shadow-lg text-white hover:scale-[1.05] active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:scale-100"
        disabled={saving || playlist.length === 0 || !campaignName}
        on:click={handleSave}
      >
        {saving ? "SAVING..." : "SAVE CAMPAIGN"}
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      <!-- Left Column: Available Levels -->
      <div
        class="bg-white/50 backdrop-blur-md border border-white/60 shadow-xl p-6 flex flex-col gap-4 rounded-3xl"
      >
        <div class="flex justify-between items-center text-[#4A4A4A]">
          <div>
            <h2 class="text-2xl font-black tracking-wide">Your Base Levels</h2>
            <p class="font-bold opacity-75 text-sm">
              Select single-hole levels to add.
            </p>
          </div>

        </div>

        {#if loading}
          <p>Loading...</p>
        {:else if levels.length === 0}
          <p>You haven't created any single-hole levels yet.</p>
        {:else}
          <div class="flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-2">
            {#each levels as level}
              <div
                class="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-3 flex justify-between items-center shadow-sm hover:shadow-md transition-all text-[#4A4A4A]"
              >
                <div class="flex items-center gap-4">
                  {#if level.thumbnailUrl}
                    <img
                      src={level.thumbnailUrl}
                      alt="thumbnail"
                      class="w-16 h-12 object-cover rounded-xl shadow-inner"
                    />
                  {/if}
                  <div>
                    <h4 class="font-bold text-lg leading-tight">
                      {level.name}
                    </h4>
                    <span class="text-xs font-bold opacity-75"
                      >Par: {level.par ||
                        (level.holes && level.holes[0]?.par)}</span
                    >
                  </div>
                </div>
                <button
                  class="w-8 h-8 rounded-full bg-[#F6A655] hover:bg-[#E57300] text-white font-black text-xl flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform"
                  on:click={() => addToPlaylist(level)}
                >
                  +
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Right Column: Playlist & Settings -->
      <div
        class="bg-white/50 backdrop-blur-md border border-white/60 shadow-xl p-6 flex flex-col gap-4 rounded-3xl"
      >
        <h2 class="text-2xl font-black tracking-wide text-[#4A4A4A]">
          Campaign Playlist
        </h2>

        <div
          class="flex flex-col gap-4 p-5 bg-white/40 border border-white/50 shadow-inner rounded-2xl text-[#4A4A4A]"
        >
          <label class="flex flex-col gap-1">
            <span class="font-bold text-sm tracking-wider">Campaign Name</span>
            <input
              class="w-full px-4 py-2 rounded-xl border border-white/50 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F6A655] transition-colors"
              type="text"
              placeholder="e.g. The Desert Classic 18"
              bind:value={campaignName}
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="font-bold text-sm tracking-wider">Campaign Theme</span>
            <select
              class="w-full px-4 py-2 rounded-xl border border-white/50 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F6A655] transition-colors"
              bind:value={campaignTheme}
            >
              {#each themeOptions as opt}
                <option value={opt.id}>{opt.name}</option>
              {/each}
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="font-bold text-sm tracking-wider">Difficulty</span>
            <select
              class="w-full px-4 py-2 rounded-xl border border-white/50 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F6A655] transition-colors"
              bind:value={campaignDifficulty}
            >
              <option value="Easy">Easy</option>
              <option value="Normal">Normal</option>
              <option value="Hard">Hard</option>
              <option value="Expert">Expert</option>
            </select>
          </label>
          <label class="flex flex-col gap-1">
            <span class="font-bold text-sm tracking-wider">Visibility</span>
            <select
              class="w-full px-4 py-2 rounded-xl border border-white/50 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F6A655] transition-colors"
              bind:value={visibility}
            >
              <option value="private">Private (Only you)</option>
              <option value="public">Public (Everyone)</option>
            </select>
          </label>
          {#if isAdmin}
            <label class="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" class="w-5 h-5 rounded border-white/50 text-[#F6A655] focus:ring-[#F6A655]" bind:checked={isOfficial} />
              <span class="font-bold text-sm tracking-wider text-[#F6A655]">Make Official Campaign</span>
            </label>
          {/if}
        </div>

        <div class="flex flex-col gap-3 overflow-y-auto max-h-[45vh] pr-2">
          {#if playlist.length === 0}
            <div
              class="p-8 text-center text-[#4A4A4A] font-bold opacity-50 border-2 border-dashed border-white/60 rounded-2xl"
            >
              Playlist is empty. Add levels from the left panel.
            </div>
          {:else}
            {#each playlist as item, i (item.playlistId)}
              <div
                class="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-3 flex justify-between items-center shadow-sm text-[#4A4A4A] relative overflow-hidden"
              >
                <!-- Accent stripe -->
                <div
                  class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#F6A655] to-[#E57300]"
                ></div>

                <div class="flex items-center gap-4 pl-3">
                  <span
                    class="w-8 h-8 rounded-full bg-white border border-[#4A4A4A]/20 flex items-center justify-center font-black text-lg text-[#F6A655] shadow-inner"
                    >{i + 1}</span
                  >
                  <div class="flex-grow">
                    <input
                      type="text"
                      class="bg-transparent border-none p-0 text-lg font-bold focus:ring-0 w-full text-[#4A4A4A] focus:outline-none"
                      bind:value={item.name}
                    />
                  </div>
                </div>
                <div class="flex gap-1">
                  <button
                    class="w-8 h-8 rounded-full bg-[#4A4A4A] text-white flex items-center justify-center hover:bg-[#333333] hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all"
                    disabled={i === 0}
                    on:click={() => moveUp(i)}>↑</button
                  >
                  <button
                    class="w-8 h-8 rounded-full bg-[#4A4A4A] text-white flex items-center justify-center hover:bg-[#333333] hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all"
                    disabled={i === playlist.length - 1}
                    on:click={() => moveDown(i)}>↓</button
                  >
                  <button
                    class="w-8 h-8 rounded-full bg-red-400 text-white flex items-center justify-center hover:bg-red-500 hover:scale-105 active:scale-95 transition-all ml-2"
                    on:click={() => removeFromPlaylist(i)}>✕</button
                  >
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>
