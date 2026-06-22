<script>
  import { goto } from "$app/navigation";
  import { auth, user } from "$lib/firebase";
  import { signInWithEmailAndPassword, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";
  import Button from "$lib/component/Button.svelte";

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
      await signInWithRedirect(auth, provider);
      // The page will redirect, so we don't need goto("/") here.
    } catch (error) {
      console.log(error);
      errorMessage = "Google sign-in failed. Please try again.";
      isSubmitting = false;
    }
  }
</script>

<div class="w-screen h-screen flex justify-center items-center bg-[#C4E9CC]">
  <div class="px-8 py-6 rounded-md flex flex-col items-center gap-6 variant-filled w-[400px] max-w-full">
    <h1 class="h1 font-acme text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
      Sign In
    </h1>

    {#if errorMessage}
      <aside class="alert variant-filled-error w-full">
        <div class="alert-message">
          <p>{errorMessage}</p>
        </div>
      </aside>
    {/if}

    <form class="w-full flex flex-col gap-4" on:submit|preventDefault={handleEmailLogin}>
      <label class="label">
        <span>Email</span>
        <input
          class="input text-black"
          title="Email"
          type="email"
          placeholder="johndoe@gmail.com"
          bind:value={email}
          autocomplete="username"
          required
        />
      </label>
      <label class="label relative">
        <span>Password</span>
        <div class="input-group input-group-divider grid-cols-[1fr_auto]">
          <input
            class="input text-black border-0 bg-transparent"
            title="Password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            on:input={(e) => password = e.target.value}
            autocomplete="current-password"
            required
          />
          <button 
            type="button" 
            class="variant-filled-surface w-16" 
            on:click={() => showPassword = !showPassword}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>
      
      <Button 
        type="submit" 
        class="w-full mt-2" 
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
    
    <hr class="opacity-50 w-full" />
    
    <Button 
      type="button" 
      class="w-full" 
      disabled={isSubmitting}
      on:click={handleGoogleLogin}
    >
      Sign In with Google
    </Button>
  </div>
</div>
