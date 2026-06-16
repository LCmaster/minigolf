<script>
  import { goto } from "$app/navigation";
  import { auth } from "$lib/firebase";
  import { signInWithEmailAndPassword } from "firebase/auth";

  let email = "";
  let password = "";

  async function handleEmailLogin() {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      goto("/");
    } catch (error) {
      console.log(error);
    }
  }
</script>

<div class="w-screen h-screen flex justify-center items-center bg-[#C4E9CC]">
  <div
    class="px-8 py-4 rounded-md flex flex-col items-center gap-4 variant-filled"
  >
    <h1
      class="h1 font-acme text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,0.5)]"
    >
      Sign In
    </h1>
    <form on:submit|preventDefault={handleEmailLogin}>
      <label class="label">
        <span>Email</span>
        <input
          class="input text-black"
          title="Email"
          type="email"
          placeholder="johndoe@gmail.com"
          bind:value={email}
        />
      </label>
      <label class="label">
        <span>Password</span>
        <input
          class="input text-black"
          title="Password"
          type="password"
          placeholder=""
          bind:value={password}
        />
      </label>
      <button type="submit">Sign in</button>
    </form>
  </div>
</div>
