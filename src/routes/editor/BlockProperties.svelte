<script>
  import { getModalStore } from "@skeletonlabs/skeleton";
  import { editor, blocks } from "./store";

  const modalStore = getModalStore();
  const deleteModal = {
    type: "confirm",
    title: "Please Confirm",
    body: "Are you sure you wish to proceed?",
    response: (r) => {
      if (r) {
        const index = $editor.selected;
        $blocks.splice(index, 1);
        $blocks = [...$blocks];
        $editor.selected = null;
      }
    },
  };

  const rotate = (direction) => {
    const block = $blocks[$editor.selected];
    let rotation = block.rotation + direction * 0.5;
    if (rotation < 0) rotation = 2 + rotation;
    if (rotation >= 2) rotation = rotation - 2;
    $blocks[$editor.selected] = { ...block, rotation };
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
            disabled={$editor.selected === null ||
              $editor.selected === 0 ||
              $blocks[$editor.selected].locked}
          >
            <img src="/editor/turn_cw.svg" alt="CW" />
          </button>
          <select
            class="select"
            value={$blocks[$editor.selected]?.rotation.toString()}
            on:change={(ev) => {
              const block = $blocks[$editor.selected];
              const rotation = parseFloat(ev.target.value);
              $blocks[$editor.selected] = { ...block, rotation };
            }}
            disabled={$editor.selected === null ||
              $editor.selected === 0 ||
              $blocks[$editor.selected].locked}
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
            disabled={$editor.selected === null ||
              $editor.selected === 0 ||
              $blocks[$editor.selected].locked}
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
    disabled={$editor.selected === null ||
      $editor.selected === 0 ||
      $blocks[$editor.selected].locked}
  >
    Delete
  </button>
</div>
