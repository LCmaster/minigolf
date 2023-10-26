<script>
  import { Group } from "three";
  import { T, forwardEventHandlers } from "@threlte/core";
  import { useGltf } from "@threlte/extras";
  import { AutoColliders, RigidBody } from "@threlte/rapier";

  export const ref = new Group();
  let body;

  const gltf = useGltf("/lobby.glb");
  const component = forwardEventHandlers();
</script>

<T.PerspectiveCamera
  makeDefault
  fov={45}
  position={[0, 1.5, 2.5]}
  on:create={({ ref }) => {
    ref.lookAt(0, 1.5, -5);
  }}
/>
<T.DirectionalLight
  color="#ffffff"
  intensity={2}
  position={[0, 2.5, 4]}
  castShadow
/>

<T is={ref} dispose={false} {...$$restProps} bind:this={$component}>
  {#await gltf}
    <slot name="fallback" />
  {:then gltf}
    <T.Mesh
      geometry={gltf.nodes.Cube002.geometry}
      material={gltf.materials.lobby}
    />
    <T.Group
      position={[-1.75, 0.06, -1.89]}
      rotation={[-Math.PI / 2, 1.38, 1.49]}
    >
      <T.Mesh
        geometry={gltf.nodes.Cylinder001.geometry}
        material={gltf.materials["handle.001"]}
      />
      <T.Mesh
        geometry={gltf.nodes.Cylinder001_1.geometry}
        material={gltf.materials.putter}
      />
      <T.Mesh
        geometry={gltf.nodes.Cylinder001_2.geometry}
        material={gltf.materials.haste}
      />
    </T.Group>
    <RigidBody
      ccd
      type="dynamic"
      bind:rigidBody={body}
      on:sleep={() => {
        body.applyImpulse({ x: 0, y: 2.5, z: 0 }, true);
      }}
    >
      <AutoColliders shape="ball" mass={1}>
        <T.Mesh
          geometry={gltf.nodes.golfball_high.geometry}
          material={gltf.materials.sign_ball}
          position={[-1.6, 0.5, -1.84]}
        />
      </AutoColliders>
    </RigidBody>
    <RigidBody type="fixed">
      <AutoColliders shape="cuboid">
        <T.Mesh position={[0, -0.5001, 0]}>
          <T.BoxGeometry args={[50, 1, 50]} />
        </T.Mesh>
      </AutoColliders>
    </RigidBody>
  {:catch error}
    <slot name="error" {error} />
  {/await}

  <slot {ref} />
</T>
