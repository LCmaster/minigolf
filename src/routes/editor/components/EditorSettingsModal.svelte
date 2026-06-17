<script lang="ts">
  import { getModalStore } from "@skeletonlabs/skeleton";

  // Props
  /** Exposes parent props to this component. */
  export let parent: any;

  // Stores
  const modalStore = getModalStore();

  // Form Data
  const formData = {
    name: $modalStore[0]?.meta?.stage?.name ?? "",
    skybox: $modalStore[0]?.meta?.stage?.skybox ?? "default",
    par: $modalStore[0]?.meta?.stage?.par ?? 2,
    groundFriction: $modalStore[0]?.meta?.stage?.groundFriction ?? 0.75,
    groundRestitution: $modalStore[0]?.meta?.stage?.groundRestitution ?? 0.75,
    wallFriction: $modalStore[0]?.meta?.stage?.wallFriction ?? 0.75,
    wallRestitution: $modalStore[0]?.meta?.stage?.wallRestitution ?? 0.95,
  };

  // We've created a custom submit function to pass the response and close the modal.
  function onFormSubmit(): void {
    if ($modalStore[0].response) $modalStore[0].response(formData);
    modalStore.close();
  }

  // Base Classes
  const cBase = "card p-4 w-modal shadow-xl space-y-4";
  const cHeader = "text-2xl font-bold";
  const cForm =
    "border border-surface-500 p-4 space-y-4 rounded-container-token";
</script>

<!-- @component This example creates a simple form modal. -->

{#if $modalStore[0]}
  <div class="modal-example-form {cBase}">
    <header class={cHeader}>Settings</header>
    <article>{$modalStore[0].body ?? "(body missing)"}</article>
    <!-- Enable for debugging: -->
    <form class="modal-form {cForm}">
      <label class="label">
        <span>Name</span>
        <input
          class="input"
          type="text"
          bind:value={formData.name}
          placeholder="Enter level name..."
        />
      </label>
      <label class="label">
        <span>Par</span>
        <input
          class="input"
          type="number"
          min="1"
          bind:value={formData.par}
          placeholder="Enter par..."
        />
      </label>
      <label class="label">
        <span>Skybox</span>
        <select class="select" bind:value={formData.skybox}>
          <option value="default">Default</option>
        </select>
      </label>
      <hr class="opacity-50" />
      <div class="grid grid-cols-2 gap-4">
        <label class="label">
          <span>Ground Friction</span>
          <input class="input" type="number" step="0.05" bind:value={formData.groundFriction} />
        </label>
        <label class="label">
          <span>Ground Restitution</span>
          <input class="input" type="number" step="0.05" bind:value={formData.groundRestitution} />
        </label>
        <label class="label">
          <span>Wall Friction</span>
          <input class="input" type="number" step="0.05" bind:value={formData.wallFriction} />
        </label>
        <label class="label">
          <span>Wall Restitution</span>
          <input class="input" type="number" step="0.05" bind:value={formData.wallRestitution} />
        </label>
      </div>
    </form>
    <!-- prettier-ignore -->
    <footer class="modal-footer {parent.regionFooter}">
        <button class="btn {parent.buttonNeutral}" on:click={parent.onClose}>{parent.buttonTextCancel}</button>
        <button class="btn {parent.buttonPositive}" on:click={onFormSubmit}>Save</button>
    </footer>
  </div>
{/if}
