<script>
  import { goto } from "$app/navigation";
  import Button from "$lib/component/Button.svelte";
  import GameScreen from "./components/GameScreen.svelte";
  import { useGame } from "./context";
  import { page } from "$app/stores";
  import { getLevel } from "$lib/level";
  import { user } from "$lib/user";
  import { onMount } from "svelte";
  import { scale, fly, fade } from "svelte/transition";
  import { backOut } from "svelte/easing";

  export let data;
  let current = 0;
  let loading = false;

  const { course, current: currentHole, shots } = useGame();

  $: if ($user !== undefined && $page.url.searchParams.get("courseId") && !$course && !loading) {
    const courseId = $page.url.searchParams.get("courseId");
    loading = true;
    getLevel(courseId)
      .then((loadedCourse) => {
        $course = loadedCourse;
        $currentHole = 0;
        $shots = loadedCourse.holes.map((_) => 0);
      })
      .catch((e) => {
        console.error("Failed to load custom course", e);
        alert(e.message || "Failed to load level.");
        goto("/");
      })
      .finally(() => {
        loading = false;
      });
  }

  function startGame() {
    $currentHole = 0;
    $course = data.courses[current];
    $shots = data.courses[current].holes.map((_) => 0);
  }

  async function quitGame() {
    // Remove courseId from URL so we go back to the select screen
    if ($page.url.searchParams.has("courseId")) {
      await goto("/game", { replaceState: true });
    }
    
    $currentHole = null;
    $course = null;
    $shots = null;
  }
</script>

{#if loading}
  <div
    class="w-screen min-h-screen bg-[#C4E9CC] flex flex-col justify-center items-center relative overflow-hidden"
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

    <div
      class="z-10 flex flex-col items-center justify-center gap-8 bg-white/40 backdrop-blur-md rounded-3xl p-12 shadow-2xl border border-white/60"
    >
      <div class="relative w-24 h-24 flex items-center justify-center">
        <!-- Bouncing Golf Ball -->
        <div
          class="absolute w-12 h-12 bg-white rounded-full shadow-lg border border-black/10 animate-bounce z-20"
        ></div>
        <!-- Shadow -->
        <div
          class="absolute bottom-0 w-12 h-3 bg-black/20 rounded-[100%] animate-pulse"
        ></div>
      </div>
      <h2
        class="text-3xl font-black tracking-widest text-[#4A4A4A] drop-shadow-sm animate-pulse"
      >
        LOADING CAMPAIGN...
      </h2>
    </div>
  </div>
{:else if $course}
  <div class="w-screen min-h-screen bg-[#C4E9CC]">
    <GameScreen on:quit={quitGame} />
  </div>
{:else}
  <div
    class="w-screen min-h-screen bg-[#C4E9CC] flex flex-col relative overflow-hidden"
  >
    <!-- Optional background decorative glowing orbs for extra premium feel -->
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

    <div class="container mx-auto px-4 py-8 z-10 flex flex-col h-full">
      <!-- Header -->
      <div class="flex justify-between items-center mb-12">
        <button
          on:click={() => goto("/")}
          class="w-12 h-12 flex justify-center items-center rounded-full bg-[#4A4A4A] hover:bg-[#333333] border-2 border-white shadow-lg transition-all hover:-translate-x-1"
        >
          <img src="/icons/back.svg" alt="Back" class="w-6 h-6" />
        </button>
        <h1
          class="h1 font-black italic tracking-widest text-[#4A4A4A] drop-shadow-[1px_1px_0px_rgba(255,255,255,0.8)]"
        >
          SELECT COURSE
        </h1>
        <div class="w-12" />
        <!-- Spacer -->
      </div>

      <!-- Carousel Area -->
      <div
        class="flex-1 flex flex-col justify-center items-center max-w-md mx-auto w-full gap-8 relative"
      >
        <!-- Svelte Key Block for smooth course transitioning -->
        {#key current}
          <div
            in:fly={{ x: 50, duration: 400, easing: backOut }}
            out:fade={{ duration: 200 }}
            class="w-full flex flex-col gap-6 p-8 rounded-3xl bg-white/50 backdrop-blur-lg border border-white/60 shadow-xl"
          >
            <h2
              class="text-3xl font-black text-[#4A4A4A] text-center drop-shadow-sm"
            >
              {data.courses[current].name}
            </h2>

            <!-- Polished Thumbnail Placeholder -->
            <div
              class="w-full h-48 rounded-2xl bg-black/5 border border-black/5 shadow-inner flex justify-center items-center relative overflow-hidden"
            >
              <!-- Inner glowing ring -->
              <div
                class="absolute w-32 h-32 bg-white/40 rounded-full blur-[40px]"
              ></div>
              <img
                src="/icons/hole.svg"
                class="w-16 h-16 opacity-30 drop-shadow-md"
                alt="Course Thumbnail"
              />
            </div>

            <!-- Stats Grid -->
            <div
              class="grid grid-cols-3 gap-2 p-4 bg-white/40 rounded-xl border border-white/30"
            >
              <div class="flex flex-col items-center">
                <span
                  class="text-xs text-black/40 uppercase font-bold tracking-wider mb-1"
                  >Holes</span
                >
                <span
                  class="text-xl font-mono font-bold text-[#7ACC52] drop-shadow-sm"
                  >{data.courses[current].holes.length}</span
                >
              </div>
              <div class="flex flex-col items-center border-x border-black/10">
                <span
                  class="text-xs text-black/40 uppercase font-bold tracking-wider mb-1"
                  >Par</span
                >
                <span
                  class="text-xl font-mono font-bold text-[#4A4A4A] drop-shadow-sm"
                >
                  {data.courses[current].holes.reduce(
                    (sum, h) => sum + (h.par || 0),
                    0,
                  )}
                </span>
              </div>
              <div class="flex flex-col items-center">
                <span
                  class="text-xs text-black/40 uppercase font-bold tracking-wider mb-1"
                  >Difficulty</span
                >
                <span
                  class="text-xl font-mono font-bold text-[#F6A655] drop-shadow-sm"
                  >{data.courses[current].difficulty || "Normal"}</span
                >
              </div>
            </div>
          </div>
        {/key}

        <!-- Navigation & Play Controls -->
        <div class="w-full flex items-center justify-between gap-4 mt-4">
          <button
            on:click={() =>
              (current = current === 0 ? data.courses.length - 1 : current - 1)}
            class="w-14 h-14 flex justify-center items-center rounded-full bg-[#4A4A4A] hover:bg-[#333333] border-2 border-white shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <img src="/icons/arrow_left.svg" alt="Prev" class="w-6 h-6" />
          </button>

          <button
            class="flex-1 py-4 rounded-full font-black text-xl tracking-widest bg-gradient-to-b from-[#F6A655] to-[#E57300] text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border-2 border-white/20"
            on:click={startGame}
          >
            PLAY NOW
          </button>

          <button
            on:click={() =>
              (current = current < data.courses.length - 1 ? current + 1 : 0)}
            class="w-14 h-14 flex justify-center items-center rounded-full bg-[#4A4A4A] hover:bg-[#333333] border-2 border-white shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <img src="/icons/arrow_right.svg" alt="Next" class="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
