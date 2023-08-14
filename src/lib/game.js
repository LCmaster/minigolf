import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

class Game {
  constructor(gui, audio, assets, renderer, simulator) {
    this._audio = audio;
    this._assets = assets;
    this._renderer = renderer;
    this._simulator = simulator;

    this._timer = new THREE.Clock();

    this.controls = new OrbitControls(
      this._renderer.camera,
      this._renderer.renderer.domElement
    );
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.minPolarAngle = Math.PI * 0.1;
    this.controls.maxPolarAngle = Math.PI * 0.25 * 1.5;
    this.controls.maxDistance = 30;
    this.controls.minDistance = 30;

    this.stage = null;
    this.player = null;

    this._timer.start();

    this._pointer = {
      pressed: false,
      origin: { x: 0, y: 0 },
      current: { x: 0, y: 0 },
    };
    this.playerSelected = false;
    this.hitPoint = { x: 0, y: 0, z: 0 };

    window.addEventListener(
      "mousemove",
      (ev) => {
        //Convert pointer screen position from screen space to clip space
        this._pointer.current.x = (ev.clientX / window.innerWidth) * 2 - 1;
        this._pointer.current.y = -(ev.clientY / window.innerHeight) * 2 + 1;

        if (this._pointer.pressed && this.playerSelected) {
          const intersections = this._renderer.castRayFromCameraToPointer(
            this._pointer.current
          );
          for (let i = 0; i < intersections.length; i++) {
            if (intersections[i].object === this.player.gfx.plane) {
              this.hitPoint.x = intersections[0].point.x;
              this.hitPoint.y = intersections[0].point.y;
              this.hitPoint.z = intersections[0].point.z;
            }
          }
        }
      },
      false
    );
    window.addEventListener(
      "mousedown",
      (ev) => {
        this._pointer.pressed = true;
        this._pointer.origin.x = this._pointer.current.x;
        this._pointer.origin.y = this._pointer.current.y;

        const intersections = this._renderer.castRayFromCameraToPointer(
          this._pointer.current
        );

        for (let i = 0; i < intersections.length; i++) {
          if (intersections[i].object === this.player.gfx.ball) {
            this.playerSelected = true;
            this.controls.enabled = false;
          }
        }
      },
      false
    );
    window.addEventListener(
      "mouseup",
      (ev) => {
        if (this._pointer.pressed && this.playerSelected) {
          const playerPosition = this.player.gfx.ball.position.clone();
          const hitDirection = new THREE.Vector3(
            playerPosition.x - this.hitPoint.x,
            playerPosition.y - this.hitPoint.y,
            playerPosition.z - this.hitPoint.z
          );

          const hitForce = Math.min(
            new THREE.Vector3(
              this.hitPoint.x,
              this.hitPoint.y,
              this.hitPoint.z
            ).distanceTo(
              new THREE.Vector3(
                playerPosition.x,
                playerPosition.y,
                playerPosition.z
              )
            ),
            5
          );

          const force = hitDirection.normalize().multiplyScalar(hitForce);

          this.player.rigidBody.applyImpulse(
            { x: force.x, y: 0.0, z: force.z },
            true
          );
        }
        this.hitPoint = { x: 0, y: 0, z: 0 };

        this._pointer.origin = { x: 0, y: 0 };
        this._pointer.pressed = false;

        this.playerSelected = false;
        this.controls.enabled = true;
      },
      false
    );
  }

  loadMainMenuStage() {
    //TODO: implement this method
  }

  loadStage(stage) {
    const playerMeshGroup = this._renderer.createPlayer();
    this.player = {
      gfx: {
        group: playerMeshGroup[0],
        ball: playerMeshGroup[1],
        plane: playerMeshGroup[2],
      },
      rigidBody: this._simulator.createPlayerBody(),
    };
    this.player.gfx.group.position.y += 1;

    this._assets.loadStageModel(stage, (gltf) => {
      const model = gltf.scene;

      const colliders = [];
      let targetSensor = null;
      let spawnPosition = null;
      model.traverse((object) => {
        if (object.isMesh) {
          object.receiveShadow = true;

          const poleMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
          });
          const flagMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
          });
          const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x993333,
          });
          const courseMaterial = new THREE.MeshStandardMaterial({
            color: 0x99ccff,
          });
          const terrainMaterial = new THREE.MeshStandardMaterial({
            color: "seagreen",
          });

          if (object.name.startsWith("Wall_")) {
            object.material = wallMaterial;
          } else if (object.name.startsWith("Pole")) {
            object.material = poleMaterial;
          } else if (object.name.startsWith("Flag")) {
            object.material = flagMaterial;
            object.material.side = THREE.DoubleSide;
          } else if (object.name.startsWith("Course")) {
            object.material = courseMaterial;
          } else if (object.name.startsWith("Ground")) {
            object.material = terrainMaterial;
          } else if (object.name.startsWith("Collider")) {
            colliders.push(object);

            this._simulator.createBoxCollider(
              {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z,
              },
              {
                w: object.quaternion.w,
                x: object.quaternion.x,
                y: object.quaternion.y,
                z: object.quaternion.z,
              },
              {
                x: object.scale.x,
                y: object.scale.y,
                z: object.scale.z,
              }
            );
          } else if (object.name === "Start") {
            spawnPosition = {
              x: object.position.x,
              y: object.position.y + 1,
              z: object.position.z,
            };
            colliders.push(object);
          } else if (object.name === "Target") {
            targetSensor = this._simulator.createBoxSensor(
              {
                x: object.position.x,
                y: object.position.y,
                z: object.position.z,
              },
              {
                w: object.quaternion.w,
                x: object.quaternion.x,
                y: object.quaternion.y,
                z: object.quaternion.z,
              },
              {
                x: object.scale.x,
                y: object.scale.y,
                z: object.scale.z,
              }
            );
            colliders.push(object);
          }
        }
      });

      colliders.forEach((collider) => {
        if (collider.parent !== null) {
          collider.parent.remove(collider);
        }
      });

      this.player.rigidBody.setTranslation(spawnPosition, true);

      this._renderer.addToScene(model);
      this._simulator.createFloor();

      this.stage = {
        name: stage,
        spawnPosition: spawnPosition,
        target: targetSensor,
      };
    });
  }

  update() {
    const elapsed = this._timer.getElapsedTime();
    const deltaTime = this._timer.getDelta();

    this._simulator.update();

    if (this.stage?.target && this.player) {
      if (
        this._simulator.didPlayerWin(this.player.rigidBody, this.stage.target)
      ) {
        console.log("YAAAYYYYYYYY!!!");
        this.player.rigidBody.setTranslation({
          x: this.stage.spawnPosition.x,
          y: this.stage.spawnPosition.y,
          z: this.stage.spawnPosition.z,
        });
        this.player.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
        this.player.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        this.player.rigidBody.resetForces(true);
        this.player.rigidBody.resetTorques(true);
      }
      const playerPosition = this.player.rigidBody.translation();
      this.player.gfx.group.position.x = playerPosition.x;
      this.player.gfx.group.position.y = playerPosition.y;
      this.player.gfx.group.position.z = playerPosition.z;
    }

    this._renderer.render();

    if (this.player) {
      this.controls.target = this.player.gfx.group.position;
    }

    this.controls.update();
  }
}

export default Game;
