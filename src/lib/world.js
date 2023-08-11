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
    //TODO: Implement this method
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
      this.objects.get("Target").mesh.material.color = new THREE.Color(
        "magenta"
      );
    }
  }
  render(deltaTime) {
    this.renderer.render();
  }

  dispose() {
    //TODO: Implement this method
  }
}

export default World;
