<script>
  import { goto } from "$app/navigation";
  import { user } from "$lib/user";
  import { userProfile } from "$lib/stores/profile";
  import { updateUserProfile } from "$lib/user";
  import { onMount } from "svelte";
  import ArcadeFrame from "$lib/components/ui/ArcadeFrame.svelte";
  import ArcadeButton from "$lib/components/ui/ArcadeButton.svelte";

  let nickname = "";
  let avatarUrl = "";
  let ballColor = "#FF0000";
  let ballTrail = "none";
  let isLoading = false;
  let saveMessage = "";

  $: if ($userProfile && !nickname && !isLoading && !saveMessage) {
    nickname = $userProfile.nickname || "";
    avatarUrl = $userProfile.avatarUrl || "";
    ballColor = $userProfile.settings?.ballColor || "#FF0000";
    ballTrail = $userProfile.settings?.ballTrail || "none";
  }

  onMount(() => {
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
          ballTrail,
        },
      };

      await updateUserProfile($userProfile.id, updatedProfile);

      $userProfile = {
        ...$userProfile,
        ...updatedProfile,
        settings: { ...$userProfile.settings, ...updatedProfile.settings },
      };

      saveMessage = "Profile updated successfully!";
      setTimeout(() => (saveMessage = ""), 3000);
    } catch (err) {
      saveMessage = "Error updating profile.";
      console.error(err);
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="relative w-screen min-h-screen overflow-y-auto flex items-center justify-center p-4 md:p-8 bg-sky-400">
  <!-- Blurred Course Backdrop -->
  <div class="fixed inset-0 pointer-events-none">
    <img
      src="/courses/carnival-park-card.png"
      alt=""
      aria-hidden="true"
      class="w-full h-full object-cover blur-[8px] scale-105 brightness-75"
    />
    <div class="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-900/20 to-[#2a1205]/70"></div>
  </div>

  <div class="relative z-10 w-full flex justify-center py-6">
    <ArcadeFrame
      title="MY PROFILE"
      titleWidthClass="w-60 md:w-[330px]"
      maxWidthClass="max-w-2xl"
      showClose={true}
      closeLabel="Back to Home"
      on:close={() => goto("/")}
    >
      {#if $userProfile}
        <div class="flex flex-col gap-4">
          <!-- Avatar Preview & URL Card -->
          <div class="rounded-2xl bg-amber-50/95 border-[3px] border-[#431407] p-4 shadow-[0_4px_0_#431407] flex flex-col md:flex-row items-center gap-5">
            <div class="w-28 h-28 rounded-full border-4 border-[#431407] ring-2 ring-amber-300 shadow-lg overflow-hidden bg-gradient-to-b from-sky-300 to-emerald-400 flex items-center justify-center shrink-0">
              {#if avatarUrl}
                <img src={avatarUrl} alt="Avatar" class="w-full h-full object-cover" />
              {:else}
                <span class="text-5xl font-black text-white drop-shadow">?</span>
              {/if}
            </div>
            <div class="flex-1 w-full space-y-1.5">
              <label for="profile-avatar" class="font-black text-[#431407] text-sm uppercase tracking-wider">
                Avatar Image URL
              </label>
              <input
                id="profile-avatar"
                type="url"
                bind:value={avatarUrl}
                class="w-full rounded-xl bg-white border-2 border-[#431407]/40 focus:border-amber-500 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
                placeholder="https://example.com/my-avatar.png"
              />
              <p class="text-xs text-[#431407]/70 font-bold">
                Paste a direct link to an image to use as your avatar.
              </p>
            </div>
          </div>

          <!-- Golfer Settings Card -->
          <div class="rounded-2xl bg-amber-50/95 border-[3px] border-[#431407] p-4 shadow-[0_4px_0_#431407] grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="profile-nickname" class="font-black text-[#431407] text-xs uppercase tracking-wider block">
                Nickname
              </label>
              <input
                id="profile-nickname"
                type="text"
                bind:value={nickname}
                class="w-full rounded-xl bg-white border-2 border-[#431407]/40 focus:border-amber-500 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
              />
            </div>

            <div class="space-y-1.5">
              <span class="font-black text-[#431407] text-xs uppercase tracking-wider block">
                Role
              </span>
              <div class="w-full rounded-xl bg-amber-100/80 border-2 border-[#431407]/25 px-3 py-2 text-sm text-[#431407]/80 font-black capitalize select-none">
                {$userProfile.role || "Player"}
              </div>
            </div>

            <div class="space-y-1.5">
              <label for="profile-ball-color" class="font-black text-[#431407] text-xs uppercase tracking-wider flex items-center gap-2">
                <span>Ball Color</span>
                <span class="w-5 h-5 rounded-full border-2 border-[#431407] inline-block" style="background-color: {ballColor}"></span>
              </label>
              <div class="flex gap-2 items-center">
                <input
                  id="profile-ball-color"
                  type="color"
                  bind:value={ballColor}
                  class="w-11 h-10 rounded-xl cursor-pointer border-2 border-[#431407]/40 bg-white p-0.5"
                />
                <input
                  type="text"
                  aria-label="Ball color hex"
                  bind:value={ballColor}
                  class="flex-1 rounded-xl bg-white border-2 border-[#431407]/40 focus:border-amber-500 px-3 py-2 text-sm font-bold text-slate-900 uppercase focus:outline-none"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label for="profile-ball-trail" class="font-black text-[#431407] text-xs uppercase tracking-wider block">
                Ball Trail
              </label>
              <select
                id="profile-ball-trail"
                bind:value={ballTrail}
                class="w-full rounded-xl bg-white border-2 border-[#431407]/40 focus:border-amber-500 px-3 py-2 text-sm font-black text-slate-900 focus:outline-none"
              >
                <option value="none">None</option>
                <option value="sparkle">Sparkle</option>
                <option value="rainbow">Rainbow</option>
              </select>
            </div>
          </div>

          <!-- Save Action Bar -->
          <div class="flex flex-col items-center justify-center gap-2 pt-2">
            <ArcadeButton
              variant="green"
              size="lg"
              disabled={isLoading}
              on:click={handleSave}
            >
              {isLoading ? "Saving..." : "Save Profile"}
            </ArcadeButton>

            {#if saveMessage}
              <p class="font-black text-sm px-3 py-1 rounded-full bg-amber-50 border-2 border-[#431407] {saveMessage.includes('Error') ? 'text-red-600' : 'text-emerald-700'}">
                {saveMessage}
              </p>
            {/if}
          </div>
        </div>
      {:else}
        <div class="flex justify-center items-center h-56">
          <div class="w-12 h-12 border-4 border-amber-300 border-t-transparent rounded-full animate-spin"></div>
        </div>
      {/if}
    </ArcadeFrame>
  </div>
</div>
