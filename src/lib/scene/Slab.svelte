<script>
  import { BoxGeometry, Group, MeshBasicMaterial } from "three";
  import { T } from "@threlte/core";

  export let position;
  export let size;
  export let color;

  export const ref = Group;
</script>

<T is={ref} {position}>
  <T.Mesh>
    <T.BoxGeometry args={size} />
    <T.MeshBasicMaterial {color} />
  </T.Mesh>
</T>
