class WorldSimulator {
  constructor(instance) {
    this.RAPIER = instance;
    this.worldSimulator = new this.RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
  }

  createBoxBody() {
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.dynamic().setTranslation(
      0.0,
      5.0,
      0.0
    );
    const rigidBody = this.worldSimulator.createRigidBody(rigidBodyDesc);

    const colliderDesc = this.RAPIER.ColliderDesc.ball(0.5).setRestitution(1);
    const collider = this.worldSimulator.createCollider(
      colliderDesc,
      rigidBody
    );

    return rigidBody;
  }

  createFloor() {
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed();
    const rigidBody = this.worldSimulator.createRigidBody(rigidBodyDesc);

    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(50, 0.5, 50);
    const collider = this.worldSimulator.createCollider(
      colliderDesc,
      rigidBody
    );

    return rigidBody;
  }

  update() {
    this.worldSimulator.step();
  }
}

export default WorldSimulator;
