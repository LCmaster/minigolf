<script lang="ts">
  import { createEventDispatcher } from "svelte";

  let type: string;
  let variation: number;
  let rotation: number;

  const dispatch = createEventDispatcher();

  function formHandler() {
    dispatch("add", { type, variation, rotation });
  }
</script>

<form class="card" on:submit|preventDefault={formHandler}>
  <h3 class="card-header h3">Choose a block to add</h3>
  <div class="p-4">
    <label class="label">
      <span>Type</span>
      <select class="select" bind:value={type}>
        <option value="extension">Extension</option>
        <option value="curve">Curve</option>
        <option value="slope">Slope</option>
        <option value="fork">Fork</option>
        <option value="end">End</option>
      </select>
    </label>
    <label class="label">
      <span>Variation</span>
      <select class="select" bind:value={variation}>
        <option value="1">1</option>
      </select>
    </label>
    <label class="label">
      <span>Rotation</span>
      <select class="select" bind:value={rotation}>
        <option value="0">0&deg;</option>
        <option value="0.5">90&deg;</option>
        <option value="1">180&deg;</option>
        <option value="1.5">270&deg;</option>
      </select>
    </label>
  </div>
  <div class="card-footer">
    <button type="submit" class="btn variant-filled"> Add </button>
    <button
      type="button"
      class="btn variant-filled"
      on:click={() => dispatch("cancel")}
    >
      Cancel
    </button>
  </div>
</form>
