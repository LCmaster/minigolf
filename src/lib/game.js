import * as THREE from "three";

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

    this.camera = new THREE.PerspectiveCamera(75, WIDTH / HEIGHT, 0.1, 100);
    this.scene.add(this.camera);
    this.camera.position.x = 5;
    this.camera.position.y = 5;
    this.camera.position.z = -5;
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

    window.addEventListener("focus", onResize, false);
    window.addEventListener("resize", onResize, false);

    this.pointer = new THREE.Vector2();
    window.addEventListener(
      "click",
      (ev) => {
        //Convert pointer screen position from screen space to clip space
        this.pointer.x = (ev.clientX / WIDTH) * 2 - 1;
        this.pointer.y = -(ev.clientY / HEIGHT) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(
          this.world.objects
            .filter((obj) => obj.type === "Player")
            .map((obj) => obj.mesh)
        );

        this.world.objects
          .filter(
            (obj) =>
              intersects.filter((hitTest) => hitTest.object === obj.mesh)
                .length > 0
          )
          .forEach((obj) => this.world.hitPlayerBall(obj));
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
