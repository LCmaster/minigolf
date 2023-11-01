<script>
  export let data;

  async function signout() {
    const { error } = await data.supabase.auth.signOut();
    console.log(error);
  }
</script>

<h1>Sign Out Page</h1>
<button on:click={signout}>Sign Out</button>
