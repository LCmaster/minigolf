<script>
  import { T } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import { Collider, RigidBody, AutoColliders } from "@threlte/rapier";
  import { OrbitControls } from "@threlte/extras";
  import * as THREE from "three";

  export let stage = "001";
  const gltf = useGltf(`Stage_${stage}.glb`);

  //   gltf.then(console.log);

  const courseMaterial = new THREE.MeshStandardMaterial({
    color: 0x99ccff,
  });
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x993333,
  });
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
  });
  const flagMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
  });
  const terrainMaterial = new THREE.MeshStandardMaterial({
    color: "seagreen",
  });

  let target;
  let spawnPosition;
</script>

{#if $gltf}
  <T.DirectionalLight
    color="#ffffff"
    intensity={2}
    position={[10, 10, 10]}
    castShadow
  />

  <!-- <T is={$gltf.scene} /> -->
  <T.Group name="Scene">
    {#each Object.values($gltf.scene.children) as child, i}
      {#if child.name.startsWith("Wall_")}
        <T.Mesh
          geometry={child.geometry}
          material={wallMaterial}
          position={[...child.position]}
        />
      {:else if child.name.startsWith("Collider")}
        <RigidBody type={"fixed"}>
          <Collider
            contactForceEventThreshold={30}
            restitution={0.4}
            shape={"cuboid"}
            scale={[...child.scale]}
            args={[...child.position]}
            rotation={[...child.quaternion]}
          />
        </RigidBody>
      {/if}
    {/each}
    <RigidBody type="fixed">
      <AutoColliders shape={"trimesh"}>
        <T.Mesh
          geometry={$gltf.nodes.Course.geometry}
          material={courseMaterial}
          position={[...$gltf.nodes.Course.position]}
        />
      </AutoColliders>
    </RigidBody>
    <T.Mesh
      geometry={$gltf.nodes.Pole.geometry}
      material={poleMaterial}
      position={[...$gltf.nodes.Pole.position]}
    />
    <T.Mesh
      geometry={$gltf.nodes.Flag.geometry}
      material={flagMaterial}
      position={[...$gltf.nodes.Flag.position]}
    />
    <T.Mesh
      geometry={$gltf.nodes.Ground.geometry}
      material={terrainMaterial}
      position={[...$gltf.nodes.Ground.position]}
    />

    <T.Group position={[...$gltf.nodes.Start.position]}>
      <RigidBody type="dynamic">
        <AutoColliders shape={"ball"}>
          <T.Mesh>
            <T.IcosahedronGeometry args={[0.45, 2]} />
            <T.MeshStandardMaterial flatShading color={"red"} />
          </T.Mesh>
        </AutoColliders>
      </RigidBody>
    </T.Group>
  </T.Group>
  <T.PerspectiveCamera
    makeDefault
    fov={45}
    position={[0, 25, 25]}
    target={[...$gltf.nodes.Start.position]}
  >
    <OrbitControls autoRotate enableDamping />
  </T.PerspectiveCamera>
{/if}
