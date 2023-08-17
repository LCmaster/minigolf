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
    this.hitPoint = new THREE.Vector3();

    this.arrowIndicator = null;

    this._assets.loadGltfModel("ForceArrow.glb", (gltf) => {
      const model = gltf.scene;
      model.traverse((obj) => {
        if (obj.isMesh) {
          const arrowMaterial = new THREE.MeshBasicMaterial();
          arrowMaterial.color = new THREE.Color(0xffffff);
          arrowMaterial.depthTest = false;
          obj.material = arrowMaterial;
          obj.renderOrder = 999999;
        }
      });

      this.arrowIndicator = model;
    });

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
              this.hitPoint = intersections[i].point.clone();

              this.arrowIndicator.position.set(...this.hitPoint);

              const distance = this.hitPoint.distanceTo(
                this.player.gfx.group.position
              );

              const hitForce = Math.min(distance, 5);

              let lookAtTarget = new THREE.Vector3();
              lookAtTarget
                .subVectors(
                  this.arrowIndicator.position,
                  this.player.gfx.group.position
                )
                .add(this.arrowIndicator.position);

              this.arrowIndicator.scale.set(
                hitForce - 0.75,
                1,
                hitForce - 0.75
              );
              this.arrowIndicator.lookAt(lookAtTarget);
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

            this._renderer.scene.add(this.arrowIndicator);
          }
        }
      },
      false
    );
    window.addEventListener(
      "mouseup",
      (ev) => {
        this._renderer.scene.remove(this.arrowIndicator);
        this.arrowIndicator.position.setScalar(0);

        if (this._pointer.pressed && this.playerSelected) {
          const distance = this.hitPoint.distanceTo(
            this.player.gfx.group.position
          );

          const hitForce = Math.min(distance, 5);

          const hitDirection = new THREE.Vector3();
          hitDirection
            .subVectors(this.hitPoint, this.player.gfx.group.position)
            .normalize()
            .multiplyScalar(hitForce)
            .negate();
          this.player.rigidBody.applyImpulse(
            { x: hitDirection.x, y: 0.0, z: hitDirection.z },
            true
          );
        }
        this.hitPoint = new THREE.Vector3();

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

    this._assets.loadGltfModel(stage, (gltf) => {
      const model = gltf.scene;

      const meshToRemoveFromScene = [];
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

            this._simulator.createTrimeshCollider(
              object.geometry.attributes.position.array,
              object.geometry.index.array,
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
          } else if (object.name.startsWith("Ground")) {
            object.material = terrainMaterial;
          } else if (
            object.name.startsWith("Collider") ||
            object.name === "Target"
          ) {
            meshToRemoveFromScene.push(object);

            const boxBody = this._simulator.createBox(
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
              },
              object.name === "Target"
            );

            if (object.name === "Target") {
              targetSensor = boxBody;
            }
          } else if (object.name === "Start") {
            spawnPosition = {
              x: object.position.x,
              y: object.position.y + 1,
              z: object.position.z,
            };
            meshToRemoveFromScene.push(object);
          }
        }
      });

      meshToRemoveFromScene.forEach((obj) => {
        if (obj.parent !== null) {
          obj.parent.remove(obj);
        }
      });

      this.player.rigidBody.setTranslation(spawnPosition, true);

      this._renderer.addToScene(model);

      //Floor
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

    if (this.player) {
      if (
        this.stage?.target &&
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

      const { x, y, z } = this.player.rigidBody.translation();
      this.player.gfx.group.position.x = x;
      this.player.gfx.group.position.y = y;
      this.player.gfx.group.position.z = z;
    }

    this._renderer.render();

    if (this.player) {
      this.controls.target = this.player.gfx.group.position;
    }

    this.controls.update();
  }
}

export default Game;
