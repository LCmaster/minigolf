<script>
  import { goto } from "$app/navigation";
  import { user } from "$lib/user";
  import { userProfile } from "$lib/stores/profile";
  import { updateUserProfile } from "$lib/user";
  import { onMount } from "svelte";

  let nickname = "";
  let avatarUrl = "";
  let ballColor = "#FF0000";
  let ballTrail = "none";
  let isLoading = false;
  let saveMessage = "";

  // Make sure we load the initial data
  $: if ($userProfile && !nickname && !isLoading && !saveMessage) {
    nickname = $userProfile.nickname || "";
    avatarUrl = $userProfile.avatarUrl || "";
    ballColor = $userProfile.settings?.ballColor || "#FF0000";
    ballTrail = $userProfile.settings?.ballTrail || "none";
  }

  onMount(() => {
    // Redirect if not signed in
    if (!$user) {
      goto("/");
    }
  });

  async function handleSave() {
    if (!$userProfile) return;
    
    isLoading = true;
    saveMessage = "";

    try {
      const updatedProfile = {
        nickname: nickname.trim(),
        avatarUrl: avatarUrl.trim(),
        settings: {
          ballColor,
          ballTrail
        }
      };

      await updateUserProfile($userProfile.id, updatedProfile);
      
      // Update local store
      $userProfile = { 
        ...$userProfile,
        ...updatedProfile,
        settings: { ...$userProfile.settings, ...updatedProfile.settings }
      };

      saveMessage = "Profile updated successfully!";
      setTimeout(() => saveMessage = "", 3000);
    } catch (err) {
      saveMessage = "Error updating profile.";
      console.error(err);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="w-screen h-screen overflow-y-auto bg-[#C4E9CC] flex flex-col relative overflow-x-hidden p-4 md:p-8">
  <!-- Background glowing orbs -->
  <div class="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
    <div class="absolute -top-32 -left-32 w-96 h-96 bg-white/20 rounded-full blur-[100px]"></div>
    <div class="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-white/20 rounded-full blur-[120px]"></div>
  </div>

  <div class="z-10 flex flex-col items-center w-full max-w-2xl mx-auto">
    
    <!-- Header -->
    <div class="flex items-center justify-between w-full mb-8">
      <button 
        class="btn bg-white/50 backdrop-blur-md hover:bg-white/80 border border-white/60 text-[#4A4A4A] font-bold rounded-full px-6 py-2 shadow-sm transition-transform hover:scale-105"
        on:click={() => goto('/')}
      >
        &larr; Back
      </button>
      <h1 class="text-3xl font-black text-[#4A4A4A] drop-shadow-md">My Profile</h1>
      <div class="w-24"></div> <!-- Spacer for flex centering -->
    </div>

    <!-- Profile Card -->
    {#if $userProfile}
      <div class="w-full bg-white/60 backdrop-blur-xl border border-white rounded-3xl shadow-xl p-6 md:p-10 flex flex-col gap-8">
        
        <!-- Avatar Preview & Input -->
        <div class="flex flex-col md:flex-row items-center gap-6">
          <div class="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-[#C4E9CC] flex items-center justify-center shrink-0">
            {#if avatarUrl}
              <img src={avatarUrl} alt="Avatar" class="w-full h-full object-cover" on:error={(e) => e.target.style.display = 'none'} />
            {:else}
              <span class="text-5xl font-black text-white/50">?</span>
            {/if}
          </div>
          <div class="flex-1 w-full space-y-2">
            <label class="font-bold text-[#4A4A4A] text-lg">Avatar Image URL</label>
            <input 
              type="url" 
              bind:value={avatarUrl} 
              class="input rounded-xl bg-white/80 border-white/50 focus:border-[#F6A655] focus:ring-[#F6A655] w-full" 
              placeholder="https://example.com/my-avatar.png" 
            />
            <p class="text-sm text-[#4A4A4A]/60 font-medium">Paste a direct link to an image to use as your avatar.</p>
          </div>
        </div>

        <hr class="border-white/50" />

        <!-- User Settings Form -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div class="space-y-2">
            <label class="font-bold text-[#4A4A4A] text-lg">Nickname</label>
            <input 
              type="text" 
              bind:value={nickname} 
              class="input rounded-xl bg-white/80 border-white/50 focus:border-[#F6A655] focus:ring-[#F6A655] w-full" 
            />
          </div>

          <div class="space-y-2">
            <label class="font-bold text-[#4A4A4A] text-lg">Role</label>
            <div class="input rounded-xl bg-black/5 border-white/50 w-full text-[#4A4A4A]/70 font-bold capitalize select-none cursor-not-allowed">
              {$userProfile.role || 'Player'}
            </div>
          </div>

          <div class="space-y-2">
            <label class="font-bold text-[#4A4A4A] text-lg flex items-center gap-3">
              Ball Color
              <div class="w-6 h-6 rounded-full border-2 border-white shadow-sm" style="background-color: {ballColor}"></div>
            </label>
            <div class="flex gap-2 items-center">
              <input 
                type="color" 
                bind:value={ballColor} 
                class="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent p-0" 
              />
              <input 
                type="text" 
                bind:value={ballColor} 
                class="input rounded-xl bg-white/80 border-white/50 focus:border-[#F6A655] focus:ring-[#F6A655] flex-1 uppercase" 
              />
            </div>
          </div>

          <div class="space-y-2">
            <label class="font-bold text-[#4A4A4A] text-lg">Ball Trail</label>
            <select bind:value={ballTrail} class="select rounded-xl bg-white/80 border-white/50 focus:border-[#F6A655] focus:ring-[#F6A655] w-full font-bold text-[#4A4A4A]">
              <option value="none">None</option>
              <option value="sparkle">Sparkle</option>
              <option value="rainbow">Rainbow</option>
            </select>
          </div>

        </div>

        <hr class="border-white/50" />

        <!-- Actions -->
        <div class="flex flex-col items-center justify-center gap-3">
          <button 
            class="btn bg-[#F6A655] hover:bg-[#E57300] text-white font-black text-xl rounded-full px-12 py-3 shadow-lg transition-transform hover:scale-105 active:scale-95 w-full md:w-auto"
            on:click={handleSave}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Profile"}
          </button>
          
          {#if saveMessage}
            <p class="font-bold {saveMessage.includes('Error') ? 'text-red-500' : 'text-[#567D46]'} animate-pulse">
              {saveMessage}
            </p>
          {/if}
        </div>

      </div>
    {:else}
      <div class="flex justify-center items-center h-64">
        <div class="w-12 h-12 border-4 border-[#F6A655] border-t-transparent rounded-full animate-spin"></div>
      </div>
    {/if}

  </div>
</div>
