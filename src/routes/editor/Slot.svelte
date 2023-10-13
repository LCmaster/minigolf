<script>
  import { BoxGeometry, Group, MeshBasicMaterial } from "three";
  import { T } from "@threlte/core";
  import { blocks } from "./store";

  export let parent;
  let position = $blocks[parent].position;
  let rotation = $blocks[parent].rotation;

  export const ref = new Group();
</script>

<T is={ref} {position} rotation={[0, -Math.PI * rotation, 0]}>
  <T.Mesh>
    <T.BoxGeometry args={[0.25, 0.25, 0.25]} />
    <T.MeshBasicMaterial color={"#990000"} />
  </T.Mesh>
</T>
