import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

class Game {
  constructor(audio, assets, renderer, simulator) {
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
    this.controls.minPolarAngle = Math.PI * 0.25;
    this.controls.maxPolarAngle = Math.PI * 0.25 * 1.25;
    this.controls.maxDistance = 10;
    this.controls.minDistance = 10;

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
    //TODO: implement this method
    console.log("Load Stage ", stage);

    this.stage = {
      rigidBody: this._simulator.createFloor(),
      mesh: this._renderer.createFloor(),
    };

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
  }

  update() {
    const elapsed = this._timer.getElapsedTime();
    const deltaTime = this._timer.getDelta();

    this._simulator.update();

    if (this.stage && this.player) {
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
