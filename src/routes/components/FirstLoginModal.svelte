<script>
  import { getModalStore } from "@skeletonlabs/skeleton";
  import { updateUserProfile } from "$lib/user";
  import { userProfile } from "$lib/stores/profile";

  export let parent;

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
          ballTrail: "none"
        }
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
  <div class="card p-8 w-modal shadow-xl space-y-4 bg-white/90 backdrop-blur-md rounded-3xl border border-white">
    <h2 class="h2 font-black text-[#4A4A4A]">Welcome to Minigolf Mania!</h2>
    <p class="text-[#4A4A4A]/80">Please choose a nickname to get started. You can change this and customize your avatar later in your profile settings.</p>

    <div class="space-y-2">
      <label class="font-bold text-[#4A4A4A]">
        Nickname
        <input 
          type="text" 
          bind:value={nickname} 
          class="input mt-1 rounded-xl bg-white border-[#C4E9CC] focus:border-[#F6A655] focus:ring-[#F6A655]" 
          placeholder="e.g. GolfMaster99" 
        />
      </label>
      {#if error}
        <p class="text-red-500 text-sm font-bold">{error}</p>
      {/if}
    </div>

    <footer class="flex justify-end pt-4">
      <button 
        class="btn bg-[#F6A655] hover:bg-[#E57300] text-white font-bold rounded-full px-6 py-2 shadow-md transition-transform hover:scale-105" 
        on:click={handleSave}
        disabled={isLoading}
      >
        {isLoading ? "Saving..." : "Start Playing!"}
      </button>
    </footer>
  </div>
{/if}
