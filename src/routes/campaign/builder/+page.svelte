<script>
  import JSZip from "jszip";
  import { user, getMyLevels, saveCampaign } from "$lib/firebase";
  import { goto } from "$app/navigation";
  import { themeOptions } from "$lib/scene/themes";

  let fileInput;

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

  async function handleImport(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of files) {
      try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);
        const configJson = await loadedZip.file("config.json").async("string");
        const courseData = JSON.parse(configJson);

        if (courseData.holes && courseData.holes.length > 0) {
          // Wrap it in a structure compatible with our playlist
          const importedLevel = {
            name: courseData.name || "Imported Level",
            par: courseData.holes[0].par || 2,
            holes: courseData.holes,
            thumbnailUrl: null, // Local zip won't have a Firebase thumbnail
          };
          addToPlaylist(importedLevel);
        } else if (courseData.controlPoints) {
          // Fallback for older exports that only had controlPoints
          const importedLevel = {
            name: courseData.name || "Imported Level",
            par: 2,
            holes: [
              { par: 2, controlPoints: courseData.controlPoints, blocks: [] },
            ],
            thumbnailUrl: null,
          };
          addToPlaylist(importedLevel);
        } else {
          throw new Error("Invalid course data format.");
        }
      } catch (e) {
        console.error(e);
        alert(`Failed to import level from ZIP: ${file.name}`);
      }
    }

    event.target.value = "";
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
      const mergedHoles = playlist.flatMap((level) => level.holes);
      const thumbnailUrl = playlist[0].thumbnailUrl; // Inherit first level's thumbnail

      await saveCampaign(
        $user.uid,
        campaignName,
        campaignTheme,
        thumbnailUrl,
        mergedHoles,
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

<div
  class="w-screen min-h-screen bg-[#C4E9CC] flex flex-col relative overflow-x-hidden"
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
          <div>
            <input
              type="file"
              accept=".zip"
              multiple
              style="display: none;"
              bind:this={fileInput}
              on:change={handleImport}
            />
            <button
              class="py-2 px-4 rounded-full font-bold text-sm tracking-wider bg-white/70 hover:bg-white backdrop-blur-md border border-white/50 shadow-sm text-[#4A4A4A] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              on:click={() => fileInput.click()}
            >
              Import ZIP
            </button>
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
