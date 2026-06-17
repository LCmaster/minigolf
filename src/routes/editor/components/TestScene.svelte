<script>
  import { MeshBasicMaterial } from "three";
  import { interactivity } from "@threlte/extras";
  import Stage from "../../../lib/scene/Stage.svelte";
  import { useEditor } from "../context";

  const { controlPoints, stage } = useEditor();

  const groundMaterial = new MeshBasicMaterial({
    color: 0x99ccff,
  });
  const wallMaterial = new MeshBasicMaterial({
    color: "sandybrown",
  });

  interactivity();
</script>

<Stage 
  controlPoints={$controlPoints} 
  skybox={$stage.skybox} 
  groundFriction={$stage.groundFriction}
  groundRestitution={$stage.groundRestitution}
  wallFriction={$stage.wallFriction}
  wallRestitution={$stage.wallRestitution}
  on:completed 
/>
