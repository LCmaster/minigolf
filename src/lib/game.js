import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import Timer from "$lib/timer.js";
import World from "$lib/world.js";
import WorldRenderer from "$lib/graphics.js";
import WorldSimulator from "$lib/physics.js";

class Game {
  constructor(canvas) {
    this.timer = new Timer();
    this.raycaster = new THREE.Raycaster();

    let WIDTH = window.innerWidth;
    let HEIGHT = window.innerHeight;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, 0.1, 100);
    this.scene.add(this.camera);
    this.camera.position.x = 10;
    this.camera.position.y = 10;
    this.camera.position.z = -10;
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });
    this.renderer.setSize(WIDTH, HEIGHT);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const onResize = (ev) => {
      WIDTH = window.innerWidth;
      HEIGHT = window.innerHeight;

      this.camera.aspect = WIDTH / HEIGHT;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(WIDTH, HEIGHT);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.minPolarAngle = Math.PI * 0.25;
    this.controls.maxPolarAngle = Math.PI * 0.25;

    window.addEventListener("focus", onResize, false);
    window.addEventListener("resize", onResize, false);

    this.pointer = {
      isDown: false,
      origin: new THREE.Vector2(),
      position: new THREE.Vector2(),
    };

    this.playerSelected = false;
    this.hitPoint = new THREE.Vector3();

    window.addEventListener(
      "mousemove",
      (ev) => {
        //Convert pointer screen position from screen space to clip space
        this.pointer.position.x = (ev.clientX / WIDTH) * 2 - 1;
        this.pointer.position.y = -(ev.clientY / HEIGHT) * 2 + 1;

        if (this.pointer.isDown) {
          if (this.playerSelected) {
            this.raycaster.setFromCamera(this.pointer.position, this.camera);

            const intersects = this.raycaster.intersectObject(
              this.world.objects.get("Terrain").mesh
            );

            if (intersects.length) {
              const playerPosition = this.world.objects
                .get("Player")
                .mesh.position.clone();

              this.hitPoint = intersects[0].point.clone();
              this.hitPoint.y = playerPosition.y;
            }
          }
        }
      },
      false
    );
    window.addEventListener(
      "mousedown",
      (ev) => {
        this.pointer.isDown = true;
        this.pointer.origin = this.pointer.position.clone();

        this.raycaster.setFromCamera(this.pointer.position, this.camera);
        const player = this.world.objects.get("Player").mesh;
        const terrain = this.world.objects.get("Terrain").mesh;
        const objectsToTest = [player, terrain];

        const intersects = this.raycaster.intersectObjects(objectsToTest);

        if (intersects[0].object === player) {
          this.playerSelected = true;
          this.controls.enabled = false;
        }
      },
      false
    );
    window.addEventListener(
      "mouseup",
      (ev) => {
        if (this.pointer.isDown && this.playerSelected) {
          const playerPosition = this.world.objects
            .get("Player")
            .mesh.position.clone();

          const hitDirection = new THREE.Vector3();
          hitDirection.subVectors(playerPosition, this.hitPoint).normalize;
          const hitForce = Math.min(
            this.hitPoint.distanceTo(playerPosition),
            5
          );

          this.world.hitPlayerBall(
            this.world.objects.get("Player"),
            hitDirection.multiplyScalar(hitForce)
          );

          this.hitPoint = new THREE.Vector3();
          this.controls.enabled = true;
        }

        this.pointer.isDown = false;
        this.playerSelected = false;
        this.terrainSelected = false;
        this.pointer.origin = new THREE.Vector2();
      },
      false
    );
  }

  async init() {
    const worldSimulator = new WorldSimulator(
      await import("@dimforge/rapier3d")
    );
    const worldRenderer = new WorldRenderer(
      this.scene,
      this.camera,
      this.renderer
    );

    this.world = new World(worldRenderer, worldSimulator);
  }

  start() {
    this.timer.start();

    this.world.loadStarterLevel();
    this.world.loadLevel("intro");

    const gameLoop = () => {
      requestAnimationFrame(gameLoop);

      this.timer.tick();
      const deltaTime = this.timer.deltaTime;

      this.controls.update();
      this.world.update(deltaTime);
      this.world.render(deltaTime);
    };
    gameLoop();
  }

  dispose() {
    console.log("On Dispose");
  }
}

export default Game;
