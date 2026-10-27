<script>
  import { interactivity } from "@threlte/extras";
  import Stage from "../../../lib/scene/Stage.svelte";
  import { useEditor } from "../context";

  const { controlPoints, stage, blocks } = useEditor();

  interactivity();
</script>

<Stage 
  controlPoints={$controlPoints} 
  blocks={$blocks}
  theme={$stage.theme} 
  groundFriction={$stage.groundFriction}
  groundRestitution={$stage.groundRestitution}
  wallFriction={$stage.wallFriction}
  wallRestitution={$stage.wallRestitution}
  tileColor={$stage.tileColor || "#567D46"}
  terrainMode={$stage.terrainMode || "heightmap"}
  on:completed 
/>
