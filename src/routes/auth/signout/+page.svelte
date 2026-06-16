<script>
  import { goto } from "$app/navigation";
  import { auth } from "$lib/firebase";
  import { signOut } from "firebase/auth";

  async function signout() {
    try {
      await signOut(auth);
      goto("/");
    } catch (error) {
      console.log(error);
    }
  }
</script>

<h1>Sign Out Page</h1>
<button on:click={signout}>Sign Out</button>
