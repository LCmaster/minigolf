<script>
  import { AppBar } from "@skeletonlabs/skeleton";
</script>

<AppBar background={"variant-filled"}>
  <svelte:fragment slot="lead">
    <label class="label">
      <span>Name</span>
      <input
        class="input variant-filled rounded-lg"
        type="text"
        placeholder="Name"
      />
    </label>
    <div class="w-4" />
    <label class="label">
      <span>Environment</span>
      <select class="select variant-filled" value="1">
        <option value="1">Default</option>
      </select>
    </label>
    <div class="w-4" />
  </svelte:fragment>
  <svelte:fragment slot="trail">
    <button class="btn !bg-transparent uppercase">Test</button>
  </svelte:fragment>
  <!-- <svelte:fragment slot="headline">
    </svelte:fragment> -->
</AppBar>
