import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const STOPPED = 0;
const RUNNING = 1;
const PAUSED = 2;

class Game {
  constructor(
    gui,
    audio,
    assets,
    renderer,
    simulator,
    onStroke,
    onSuccess,
    onFailure
  ) {
    this._state = STOPPED;

    this._audio = audio;
    this._assets = assets;
    this._renderer = renderer;
    this._simulator = simulator;

    this._timer = new THREE.Clock();

    // this.controls = new OrbitControls(
    //   this._renderer.camera,
    //   this._renderer.renderer.domElement
    // );
    // this.controls.enablePan = false;
    // this.controls.enableZoom = false;
    // this.controls.minPolarAngle = Math.PI * 0.1;
    // this.controls.maxPolarAngle = Math.PI * 0.25 * 1.5;
    // this.controls.maxDistance = 30;
    // this.controls.minDistance = 30;

    this.stage = null;

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
  }

  update() {
    // const elapsed = this._timer.getElapsedTime();
    // const deltaTime = this._timer.getDelta();

    if (this._state == RUNNING) {
      this._simulator.update();

      if (this.player) {
        if (
          this.stage?.target &&
          this._simulator.didPlayerWin(this.player.rigidBody, this.stage.target)
        ) {
          // this.player.rigidBody.setTranslation({
          //   x: this.stage.spawnPosition.x,
          //   y: this.stage.spawnPosition.y,
          //   z: this.stage.spawnPosition.z,
          // });
          // this.player.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
          // this.player.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
          // this.player.rigidBody.resetForces(true);
          // this.player.rigidBody.resetTorques(true);
          this._successEventHandler();
        }

        const { x, y, z } = this.player.rigidBody.translation();
        this.player.gfx.group.position.x = x;
        this.player.gfx.group.position.y = y;
        this.player.gfx.group.position.z = z;

        // this.controls.target = this.player.gfx.group.position;
      }
    }

    this._renderer.render();
    // this.controls.update();
  }
}

export default Game;
