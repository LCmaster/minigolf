import * as THREE from "three";

class World {
  constructor(renderer, simulator) {
    this.renderer = renderer;
    this.simulator = simulator;

    this.objects = new Map([]);
  }

  loadStarterLevel() {
    const floorMesh = this.renderer.createFloor();
    const floorBody = this.simulator.createFloor();

    let position = floorBody.translation();
    floorMesh.position.x = position.x;
    floorMesh.position.y = position.y;
    floorMesh.position.z = position.z;

    const mesh = this.renderer.createRedBox();
    const body = this.simulator.createBoxBody();

    position = body.translation();
    mesh.position.x = position.x;
    mesh.position.y = position.y;
    mesh.position.z = position.z;

    const targetMesh = this.renderer.createTarget();
    const targetBody = this.simulator.createTarget();

    this.objects.set("Terrain", {
      mesh: floorMesh,
      rigidBody: floorBody,
    });
    this.objects.set("Player", { mesh: mesh, rigidBody: body });
    this.objects.set("Target", { mesh: targetMesh, rigidBody: targetBody });
  }

  loadLevel(levelName) {
    this.renderer.loadModel(`Level_${levelName}.glb`, (gltf) => {
      const model = gltf.scene;
      this.objects.set("Level", { mesh: model, rigidBody: null });
      this.renderer.scene.add(model);
    });
  }

  spawnPlayer() {
    //TODO: Implement this method
  }

  hitPlayerBall(player, direction) {
    player.rigidBody.applyImpulse(
      { x: direction.x, y: 0.0, z: direction.z },
      true
    );
  }

  update(deltaTime) {
    this.simulator.update();

    this.objects.forEach((obj) => {
      const { mesh, rigidBody } = obj;

      if (!rigidBody) return;

      const position = rigidBody.translation();
      mesh.position.x = position.x;
      mesh.position.y = position.y;
      mesh.position.z = position.z;
    });

    if (
      this.objects.size > 0 &&
      this.simulator.didPlayerCompleteCurrentLevel(
        this.objects.get("Player").rigidBody,
        this.objects.get("Target").rigidBody
      )
    ) {
      this.objects.get("Player").rigidBody.sleep();
      this.objects.get("Player").rigidBody.resetForces(false);
      this.objects.get("Player").rigidBody.resetTorques(false);
      this.objects
        .get("Player")
        .rigidBody.setTranslation({ x: 0, y: 5, z: 0 }, true);
    }
  }
  render(deltaTime) {
    this.renderer.render();
  }

  dispose() {
    for (const { key, value } in this.objects) {
      this.simulator.removeRigidBody(value.rigidBody);
      this.renderer.remove(value.mesh);
      value.rigidBody = null;
      value.mesh = null;

      this.objects.delete(key);
    }
    this.renderer.dispose();
    this.simulator.dispose();
  }
}

export default World;
