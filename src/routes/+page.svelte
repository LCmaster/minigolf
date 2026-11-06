<script>
  import { goto } from "$app/navigation";
  import { getModalStore } from "@skeletonlabs/skeleton";
  import HowToPlayModal from "./components/HowToPlayModal.svelte";
  import { auth } from "$lib/firebase";
  import { user } from "$lib/user";
  import { canEditLevels } from "$lib/stores/profile";
  import { signOut } from "firebase/auth";

  const modalStore = getModalStore();

  const modal = {
    type: "component",
    component: {
      ref: HowToPlayModal,
    },
  };

  async function handleSignout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  }
</script>

<div class="w-screen min-h-screen bg-[#C4E9CC] flex flex-col relative overflow-hidden">
  
  <!-- Background decorative glowing orbs -->
  <div class="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
    <div class="absolute -top-32 -left-32 w-96 h-96 bg-white/20 rounded-full blur-[100px]"></div>
    <div class="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-white/20 rounded-full blur-[120px]"></div>
  </div>

  <div class="z-10 flex flex-col gap-10 justify-center items-center h-full p-4">
    
    <!-- Logo with drop shadow and hover animation -->
    <img 
      src="/logo.png" 
      alt="Minigolf Mania" 
      class="w-72 md:w-96 drop-shadow-[0_15px_25px_rgba(0,0,0,0.15)] hover:scale-105 transition-transform duration-500 cursor-pointer" 
    />
    
    <!-- Menu Card (Glassmorphism) -->
    <div class="w-full max-w-sm flex flex-col gap-4 p-8 rounded-3xl bg-white/50 backdrop-blur-lg border border-white/60 shadow-xl">
      
      <button
        on:click={() => goto("/play")}
        class="w-full h-16 rounded-full font-black text-2xl tracking-widest bg-gradient-to-b from-[#2E7D32] to-[#1B5E20] text-white shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer border-2 border-white/40 flex items-center justify-center gap-2"
      >
        <span>⛳</span>
        <span>PLAY 9-HOLE TOUR</span>
      </button>

      <button
        on:click={() => goto("/editor")}
        class="w-full py-3.5 flex justify-center items-center gap-2 rounded-full font-black text-lg tracking-wider bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 border-2 border-white shadow-lg text-white hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
      >
        <span>🛠️</span>
        <span>TRACK RUNNER BUILDER</span>
      </button>

      <button
        on:click={() => goto("/game")}
        class="w-full py-2.5 flex justify-center items-center gap-2 rounded-full font-bold text-sm tracking-wider bg-white/70 hover:bg-white border border-white/60 shadow-sm text-[#4A4A4A] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
      >
        <span>Legacy Spline Mode</span>
      </button>

      <button
        on:click={() => modalStore.trigger(modal)}
        class="w-full py-3 flex justify-center items-center gap-3 rounded-full font-bold text-lg tracking-wider bg-[#4A4A4A] hover:bg-[#333333] border-2 border-white shadow-md text-white hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
      >
        <span class="flex justify-center items-center w-6 h-6 rounded-full border-2 border-white text-sm font-black">?</span>
        HOW TO PLAY
      </button>

      {#if $user}
        <div class="h-px w-full bg-white/50 my-2 shadow-sm" />
        {#if $canEditLevels}
          <button
            on:click={() => goto("/editor")}
            class="w-full py-3 rounded-full font-bold text-lg tracking-wider bg-[#4A4A4A] hover:bg-[#333333] border-2 border-white shadow-md text-white hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            Level editor
          </button>
        {/if}
        <button
          on:click={() => goto("/profile")}
          class="w-full py-3 rounded-full font-bold text-lg tracking-wider bg-[#4A4A4A] hover:bg-[#333333] border-2 border-white shadow-md text-white hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          My Profile
        </button>
        {#if $canEditLevels}
          <button
            on:click={() => goto("/mylevels")}
            class="w-full py-3 rounded-full font-bold text-lg tracking-wider bg-[#4A4A4A] hover:bg-[#333333] border-2 border-white shadow-md text-white hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            My Levels
          </button>
        {/if}
        <button
          on:click={handleSignout}
          class="w-full py-2 rounded-full font-bold text-sm tracking-wider bg-transparent hover:bg-white/20 border border-white/50 text-[#4A4A4A] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer mt-2"
        >
          Sign Out
        </button>
      {:else}
        <div class="flex items-center gap-4 w-full my-2">
          <div class="flex-1 h-px bg-white/50 shadow-sm" />
          <span class="text-sm font-black text-[#4A4A4A]/50 uppercase tracking-widest">or</span>
          <div class="flex-1 h-px bg-white/50 shadow-sm" />
        </div>
        <button
          on:click={() => goto("/auth/signin")}
          class="w-full py-3 rounded-full font-bold text-lg tracking-wider bg-white/70 hover:bg-white backdrop-blur-md border border-white/50 shadow-sm text-[#4A4A4A] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
        >
          Sign In
        </button>
      {/if}
    </div>
  </div>
</div>
