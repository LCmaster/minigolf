<script>
  import { getModalStore } from "@skeletonlabs/skeleton";
  // import { editor, blocks } from "../store";
  import { useEditor } from "../context";

  const { blocks, blockSelected } = useEditor();

  const modalStore = getModalStore();
  const deleteModal = {
    type: "confirm",
    title: "Please Confirm",
    body: "Are you sure you wish to proceed?",
    response: (r) => {
      if (r) {
        const blockIndex = $blocks.findIndex((b) => b.id === $blockSelected);
        if (blockIndex) {
          $blocks.splice(blockIndex, 1);
          $blocks = [...$blocks];
          $blockSelected = null;
        }
      }
    },
  };

  const rotate = (direction) => {
    const blockIndex = $blocks.findIndex((b) => b.id === $blockSelected);
    if (blockIndex) {
      const block = $blocks[blockIndex];
      let rotation = block.rotation + direction * 0.5;
      if (rotation < 0) rotation = 2 + rotation;
      if (rotation >= 2) rotation = rotation - 2;
      $blocks[blockIndex] = { ...block, rotation };
    }
  };
</script>

<div id="sidebar-right" class="h-full flex flex-col justify-between">
  <div class="card h-full rounded-none">
    <div class="p-4">
      <label class="label">
        <span>Rotation</span>
        <div class="flex gap-2">
          <button
            on:click={() => rotate(1)}
            type="button"
            class="btn-icon"
            disabled={$blockSelected === null || $blockSelected === 0}
          >
            <img src="/editor/turn_cw.svg" alt="CW" />
          </button>
          <select
            class="select"
            value={$blocks[$blockSelected]?.rotation.toString()}
            on:change={(ev) => {
              const blockIndex = $blocks.findIndex(
                (b) => b.id === $blockSelected
              );
              if (blockIndex) {
                const block = $blocks[blockIndex];
                const rotation = parseFloat(ev.target.value);
                $blocks[blockIndex] = { ...block, rotation };
              }
            }}
            disabled={$blockSelected === null || $blockSelected === 0}
          >
            <option value="0">0&deg;</option>
            <option value="0.5">90&deg;</option>
            <option value="1">180&deg;</option>
            <option value="1.5">270&deg;</option>
          </select>
          <button
            on:click={() => rotate(-1)}
            type="button"
            class="btn-icon"
            disabled={$blockSelected === null || $blockSelected === 0}
          >
            <img src="/editor/turn_ccw.svg" alt="CCW" />
          </button>
        </div>
      </label>
    </div>
  </div>
  <button
    class="w-full btn variant-filled-error"
    on:click={() => {
      modalStore.trigger(deleteModal);
    }}
    disabled={$blockSelected === null || $blockSelected === 0}
  >
    Delete
  </button>
</div>
