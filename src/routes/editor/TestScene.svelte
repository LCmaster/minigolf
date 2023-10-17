<script>
  import { MeshBasicMaterial } from "three";
  import { T } from "@threlte/core";
  import { interactivity } from "@threlte/extras";
  import { editor, blocks } from "./store";
  import Block from "./Block.svelte";
  import Stage from "../../lib/scene/Stage.svelte";

  const groundMaterial = new MeshBasicMaterial({
    color: 0x99ccff,
  });
  const wallMaterial = new MeshBasicMaterial({
    color: "sandybrown",
  });

  let camera;
  let controls;
  let playerPosition;

  let player;
  interactivity();
</script>

<Stage blocks={$blocks} skybox={"default"} on:completed />
