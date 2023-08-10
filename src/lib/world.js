class World {
  constructor(renderer, simulator) {
    this.renderer = renderer;
    this.simulator = simulator;

    this.objects = [];
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

    this.objects.push({
      type: "Terrain",
      mesh: floorMesh,
      rigidBody: floorBody,
    });
    this.objects.push({ type: "Player", mesh: mesh, rigidBody: body });
  }

  loadLevel(levelName) {
    //TODO: Implement this method
  }

  spawnPlayer() {
    //TODO: Implement this method
  }

  hitPlayerBall(player) {
    console.log(player);
    player.rigidBody.applyImpulse({ x: 0.0, y: 5.0, z: 0.0 }, true);
  }

  update(deltaTime) {
    this.simulator.update();

    for (const object of this.objects) {
      const { mesh, rigidBody } = object;

      const position = rigidBody.translation();
      mesh.position.x = position.x;
      mesh.position.y = position.y;
      mesh.position.z = position.z;
    }
  }
  render(deltaTime) {
    this.renderer.render();
  }

  updateRendererDimensions() {
    this.renderer.updateRendererDimensions();
  }
  dispose() {
    //TODO: Implement this method
  }
}

export default World;
