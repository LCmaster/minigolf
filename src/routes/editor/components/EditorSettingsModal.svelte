<script lang="ts">
  import { getModalStore } from "@skeletonlabs/skeleton";

  // Props
  /** Exposes parent props to this component. */
  export let parent: any;

  // Stores
  const modalStore = getModalStore();

  // Form Data
  const formData = {
    name: "",
    skybox: "default",
    par: "2",
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
          placeholder="Enter name..."
        />
      </label>
      <label class="label">
        <span>Phone Number</span>
        <input
          class="input"
          type="tel"
          bind:value={formData.tel}
          placeholder="Enter phone..."
        />
      </label>
      <label class="label">
        <span>Email</span>
        <input
          class="input"
          type="email"
          bind:value={formData.email}
          placeholder="Enter email address..."
        />
      </label>
    </form>
    <!-- prettier-ignore -->
    <footer class="modal-footer {parent.regionFooter}">
        <button class="btn {parent.buttonNeutral}" on:click={parent.onClose}>{parent.buttonTextCancel}</button>
        <button class="btn {parent.buttonPositive}" on:click={onFormSubmit}>Submit Form</button>
    </footer>
  </div>
{/if}
