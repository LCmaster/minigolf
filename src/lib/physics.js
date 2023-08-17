// import Ammo from "ammojs3";

class PhysicsEngine {
  constructor(gui, instance) {
    this.RAPIER = instance;
    this.worldSimulator = new this.RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
  }

  createTrimeshCollider(vertexBuffer, indexBuffer, position, rotation, scale) {
    const rigidBody = this.createRigidBody(false, position);

    const colliderDesc = this.RAPIER.ColliderDesc.trimesh(
      vertexBuffer,
      indexBuffer
    ).setRotation({
      w: rotation.w,
      x: rotation.x,
      y: rotation.y,
      z: rotation.z,
    });
    this.worldSimulator.createCollider(colliderDesc, rigidBody);

    return rigidBody;
  }

  createPlayerBody() {
    const collider = this.createCollider("ball", false, 0.5, {
      w: 1,
      x: 0,
      y: 0,
      z: 0,
    }).setRestitution(0.7);
    const rigidBody = this.createRigidBody(true, { x: 0, y: 10, z: 10 });
    rigidBody.setLinearDamping(0.5);
    rigidBody.setAngularDamping(0.5);

    this.worldSimulator.createCollider(collider, rigidBody);

    return rigidBody;
  }

  createFloor() {
    return this.createBox(
      { x: 0, y: -0.01, z: 0 },
      { w: 1, x: 0, y: 0, z: 0 },
      { x: 1000, y: 0.01, z: 1000 },
      false
    );
    // .setRestitution(0.25);
  }

  createBox(position, rotation, scale, isSensor) {
    const rigidBody = this.createRigidBody(false, position);
    this.worldSimulator.createCollider(
      this.createCollider("box", isSensor, scale, rotation),
      rigidBody
    );

    return rigidBody;
  }

  createRigidBody(isDynamic, position) {
    return this.worldSimulator.createRigidBody(
      (isDynamic
        ? this.RAPIER.RigidBodyDesc.dynamic()
        : this.RAPIER.RigidBodyDesc.fixed()
      ).setTranslation(position.x, position.y, position.z)
    );
  }

  createCollider(type, isSensor, scale, rotation) {
    const collider =
      type === "ball"
        ? this.RAPIER.ColliderDesc.ball(scale)
        : this.RAPIER.ColliderDesc.cuboid(scale.x, scale.y, scale.z);
    collider.setSensor(isSensor);
    collider.setRotation({
      w: rotation.w,
      x: rotation.x,
      y: rotation.y,
      z: rotation.z,
    });

    return collider;
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
