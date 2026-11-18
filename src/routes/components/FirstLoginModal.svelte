<script>
  import { getModalStore } from "@skeletonlabs/skeleton";
  import { updateUserProfile } from "$lib/user";
  import { userProfile } from "$lib/stores/profile";
  import ArcadeFrame from "$lib/components/ui/ArcadeFrame.svelte";
  import ArcadeButton from "$lib/components/ui/ArcadeButton.svelte";

  export const parent = null;

  const modalStore = getModalStore();
  let nickname = "";
  let isLoading = false;
  let error = "";

  async function handleSave() {
    if (!nickname.trim()) {
      error = "Nickname cannot be empty.";
      return;
    }
    isLoading = true;
    error = "";

    try {
      const uid = $modalStore[0].meta.uid;
      const initialProfile = {
        nickname: nickname.trim(),
        avatarUrl: "",
        role: "player",
        settings: {
          ballColor: "#FF0000",
          ballTrail: "none",
        },
      };

      await updateUserProfile(uid, initialProfile);
      $userProfile = { id: uid, ...initialProfile };
      modalStore.close();
    } catch (err) {
      error = "Failed to save profile. Try again.";
      console.error(err);
    } finally {
      isLoading = false;
    }
  }
</script>

{#if $modalStore[0]}
  <ArcadeFrame
    title="WELCOME!"
    titleWidthClass="w-56 md:w-[300px]"
    maxWidthClass="max-w-md"
    showDeckStrip={true}
  >
    <div class="rounded-2xl bg-amber-50/95 border-[3px] border-[#431407] p-5 shadow-[0_4px_0_#431407] space-y-4">
      <p class="text-sm font-bold text-slate-700 leading-relaxed">
        Choose a nickname to get started on the greens. You can customize your avatar, ball color, and wind trail anytime in your profile.
      </p>

      <div class="space-y-1.5">
        <label for="first-login-nickname" class="font-black text-[#431407] text-xs uppercase tracking-wider block">
          Nickname
        </label>
        <input
          id="first-login-nickname"
          type="text"
          bind:value={nickname}
          class="w-full rounded-xl bg-white border-2 border-[#431407]/40 focus:border-amber-500 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
          placeholder="e.g. GolfMaster99"
        />
        {#if error}
          <p class="text-rose-600 text-xs font-black">{error}</p>
        {/if}
      </div>

      <div class="flex justify-center pt-1">
        <ArcadeButton
          variant="green"
          size="md"
          disabled={isLoading}
          on:click={handleSave}
        >
          {isLoading ? "Saving..." : "Start Playing!"}
        </ArcadeButton>
      </div>
    </div>
  </ArcadeFrame>
{/if}
