<script>
  import { MeshBasicMaterial } from "three";
  import { interactivity } from "@threlte/extras";
  import Stage from "../../../lib/scene/Stage.svelte";
  import { useEditor } from "../context";

  const { blocks } = useEditor();

  const groundMaterial = new MeshBasicMaterial({
    color: 0x99ccff,
  });
  const wallMaterial = new MeshBasicMaterial({
    color: "sandybrown",
  });

  interactivity();
</script>

<Stage blocks={$blocks} skybox={"default"} on:completed />
