import * as THREE from "three";

class RenderingEngine {
  constructor(gui, canvas) {
    let WIDTH = window.innerWidth;
    let HEIGHT = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });
    this.renderer.setSize(WIDTH, HEIGHT);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, 0.1, 100);
    this.camera.position.x = 0;
    this.camera.position.y = 7.5;
    this.camera.position.z = 50;
    this.camera.lookAt(0, 0, 0);

    this.scene = new THREE.Scene();

    this.scene.add(this.camera);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // const gfxFolder = gui.addFolder("Graphics");
    // const ambientLightFolder = gfxFolder.addFolder("Ambient Light");
    // ambientLightFolder.add(ambientLight, "intensity").min(0).max(5);
    // const directionalLightFolder = gfxFolder.addFolder("Directional Light");
    // directionalLightFolder.add(directionalLight, "intensity").min(0).max(5);
    // directionalLightFolder.add(directionalLight, "castShadow");

    this.raycaster = new THREE.Raycaster();

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
  }

  castRayFromCameraToPointer(pointer) {
    this.raycaster.setFromCamera(
      new THREE.Vector2(pointer.x, pointer.y),
      this.camera
    );
    return this.raycaster.intersectObject(this.scene);
  }

  addToScene(model) {
    this.scene.add(model);
  }

  createPlayer() {
    const playerGroup = new THREE.Group();

    const ballGeometry = new THREE.SphereGeometry(0.45, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ color: "red" });
    const ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
    ballMesh.castShadow = true;

    const ballPlaneGeometry = new THREE.CircleGeometry(25, 32);
    const ballPlaneMaterial = new THREE.MeshBasicMaterial();
    ballPlaneMaterial.transparent = true;
    ballPlaneMaterial.opacity = 0;

    const ballPlaneMesh = new THREE.Mesh(ballPlaneGeometry, ballPlaneMaterial);
    ballPlaneMesh.rotateX(-Math.PI * 0.5);

    playerGroup.add(ballMesh);
    playerGroup.add(ballPlaneMesh);

    this.scene.add(playerGroup);

    return [playerGroup, ballMesh, ballPlaneMesh];
  }

  createTarget() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: "blue" });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    this.scene.add(mesh);

    return mesh;
  }

  createRedBox() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: "red" });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    this.scene.add(mesh);

    return mesh;
  }

  remove(mesh) {
    this.scene.remove(mesh);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.scene = null;
  }
}

export default async function initRenderingEngine(gui, canvas) {
  return new RenderingEngine(gui, canvas);
}
