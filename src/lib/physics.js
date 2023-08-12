class PhysicsEngine {
  constructor(instance) {
    this.RAPIER = instance;
    this.worldSimulator = new this.RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
  }

  createTarget() {
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(
      2,
      0.75,
      2
    );
    const rigidBody = this.worldSimulator.createRigidBody(rigidBodyDesc);

    const sensorDesc = this.RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5)
      .setSensor(true)
      .setRestitution(1);
    this.worldSimulator.createCollider(sensorDesc, rigidBody);

    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(
      0.5,
      0.5,
      0.5
    ).setRestitution(1);
    this.worldSimulator.createCollider(colliderDesc, rigidBody);

    return rigidBody;
  }

  createPlayerBody() {
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.dynamic().setTranslation(
      0.0,
      5.0,
      0.0
    );
    const rigidBody = this.worldSimulator.createRigidBody(rigidBodyDesc);

    const colliderDesc = this.RAPIER.ColliderDesc.ball(0.75).setRestitution(1);
    this.worldSimulator.createCollider(colliderDesc, rigidBody);

    return rigidBody;
  }

  createFloor() {
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed();
    const rigidBody = this.worldSimulator.createRigidBody(rigidBodyDesc);

    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(50, 0.5, 50);
    this.worldSimulator.createCollider(colliderDesc, rigidBody);

    return rigidBody;
  }

  didPlayerCompleteCurrentLevel(player, target) {
    return this.worldSimulator.intersectionPair(
      player.collider(0),
      target.collider(0)
    );
  }

  removeRigidBody(body) {
    this.worldSimulator.removeRigidBody(body);
  }

  update() {
    this.worldSimulator.step();
  }

  dispose() {
    this.worldSimulator = null;
  }
}

export default async function initPhysicsEngine() {
  return new PhysicsEngine(await import("@dimforge/rapier3d"));
}
