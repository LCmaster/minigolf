<script>
  import { goto } from "$app/navigation";
  import { auth } from "$lib/firebase";
  import { user } from "$lib/user";
  import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
  import ArcadeFrame from "$lib/components/ui/ArcadeFrame.svelte";
  import ArcadeButton from "$lib/components/ui/ArcadeButton.svelte";

  let email = "";
  let password = "";
  let errorMessage = "";
  let isSubmitting = false;
  let showPassword = false;

  $: if ($user) {
    goto("/");
  }

  async function handleEmailLogin() {
    errorMessage = "";
    isSubmitting = true;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      goto("/");
    } catch (error) {
      console.log(error);
      errorMessage = "Invalid email or password. Please try again.";
    } finally {
      isSubmitting = false;
    }
  }

  async function handleGoogleLogin() {
    errorMessage = "";
    isSubmitting = true;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      goto("/");
    } catch (error) {
      console.log(error);
      errorMessage = "Google sign-in failed. Please try again.";
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="relative w-screen min-h-screen flex justify-center items-center p-4 bg-sky-400">
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

  <div class="relative z-10 w-full flex justify-center">
    <ArcadeFrame
      title="SIGN IN"
      titleWidthClass="w-52 md:w-[270px]"
      maxWidthClass="max-w-md"
      showClose={true}
      closeLabel="Back to Home"
      on:close={() => goto("/")}
    >
      <div class="rounded-2xl bg-amber-50/95 border-[3px] border-[#431407] p-5 shadow-[0_4px_0_#431407] space-y-4">
        {#if errorMessage}
          <div class="rounded-xl bg-rose-100 border-2 border-rose-500 px-3 py-2 text-xs font-black text-rose-700">
            {errorMessage}
          </div>
        {/if}

        <form class="w-full flex flex-col gap-3.5" on:submit|preventDefault={handleEmailLogin}>
          <div class="space-y-1">
            <label for="signin-email" class="font-black text-[#431407] text-xs uppercase tracking-wider block">
              Email
            </label>
            <input
              id="signin-email"
              class="w-full rounded-xl bg-white border-2 border-[#431407]/40 focus:border-amber-500 px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none"
              title="Email"
              type="email"
              placeholder="johndoe@gmail.com"
              bind:value={email}
              autocomplete="username"
              required
            />
          </div>

          <div class="space-y-1">
            <label for="signin-password" class="font-black text-[#431407] text-xs uppercase tracking-wider block">
              Password
            </label>
            <div class="flex rounded-xl bg-white border-2 border-[#431407]/40 focus-within:border-amber-500 overflow-hidden">
              <input
                id="signin-password"
                class="flex-1 px-3 py-2 text-sm font-bold text-slate-900 bg-transparent focus:outline-none"
                title="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                on:input={(e) => (password = e.target.value)}
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="px-3 bg-amber-200/80 hover:bg-amber-300 border-l-2 border-[#431407]/25 text-xs font-black text-[#431407] transition-colors cursor-pointer"
                on:click={() => (showPassword = !showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div class="pt-1 flex justify-center">
            <ArcadeButton
              type="submit"
              variant="green"
              size="md"
              disabled={isSubmitting}
              extraClass="w-full"
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </ArcadeButton>
          </div>
        </form>

        <div class="border-t-2 border-[#431407]/15 pt-3 flex justify-center">
          <ArcadeButton
            type="button"
            variant="amber"
            size="md"
            disabled={isSubmitting}
            extraClass="w-full"
            on:click={handleGoogleLogin}
          >
            Sign In with Google
          </ArcadeButton>
        </div>
      </div>
    </ArcadeFrame>
  </div>
</div>
