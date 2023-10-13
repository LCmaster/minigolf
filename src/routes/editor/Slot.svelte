<script>
  import { BoxGeometry, Group, MeshBasicMaterial } from "three";
  import { T } from "@threlte/core";

  export let position;
  export const ref = new Group();
</script>

<T is={ref} {position}>
  <T.Mesh>
    <T.BoxGeometry args={[0.25, 0.25, 0.25]} />
    <T.MeshBasicMaterial color={"#990000"} />
  </T.Mesh>
</T>
