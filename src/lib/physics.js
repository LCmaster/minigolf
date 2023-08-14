class PhysicsEngine {
  constructor(gui, instance) {
    this.RAPIER = instance;
    this.worldSimulator = new this.RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
  }

  createRigidBodyFromBuffer(buffer) {}

  createBoxCollider(position, rotation, scale) {
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(
      position.x,
      position.y,
      position.z
    );
    const rigidBody = this.worldSimulator.createRigidBody(rigidBodyDesc);

    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(
      scale.x,
      scale.y,
      scale.z
    ).setRotation({
      w: rotation.w,
      x: rotation.x,
      y: rotation.y,
      z: rotation.z,
    });
    this.worldSimulator.createCollider(colliderDesc, rigidBody);

    return rigidBody;
  }
  createBoxSensor(position, rotation, scale) {
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(
      position.x,
      position.y,
      position.z
    );
    const rigidBody = this.worldSimulator.createRigidBody(rigidBodyDesc);

    const sensorDesc = this.RAPIER.ColliderDesc.cuboid(
      scale.x,
      scale.y,
      scale.z
    )
      .setSensor(true)
      .setRotation({
        w: rotation.w,
        x: rotation.x,
        y: rotation.y,
        z: rotation.z,
      });
    this.worldSimulator.createCollider(sensorDesc, rigidBody);

    return rigidBody;
  }

  createPlayerBody() {
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.dynamic();
    // .setLinearDamping(0.85)
    // .setAngularDamping(0.85);
    const rigidBody = this.worldSimulator.createRigidBody(rigidBodyDesc);

    const colliderDesc = this.RAPIER.ColliderDesc.ball(0.5).setRestitution(0.7);
    this.worldSimulator.createCollider(colliderDesc, rigidBody);

    return rigidBody;
  }

  createFloor() {
    const rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed().setTranslation(
      0,
      -0.01,
      0
    );
    const rigidBody = this.worldSimulator.createRigidBody(rigidBodyDesc);

    const colliderDesc = this.RAPIER.ColliderDesc.cuboid(
      1000,
      0.01,
      1000
    ).setRestitution(0.25);
    this.worldSimulator.createCollider(colliderDesc, rigidBody);

    return rigidBody;
  }

  didPlayerWin(player, target) {
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

export default async function initPhysicsEngine(gui) {
  return new PhysicsEngine(gui, await import("@dimforge/rapier3d"));
}
