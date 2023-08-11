import * as THREE from "three";

class WorldRenderer {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
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

  createFloor() {
    const group = new THREE.Group();

    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        const geometry = new THREE.BoxGeometry(1, 0.5, 1);
        const material = new THREE.MeshStandardMaterial({
          color: (i + j) % 2 ? "yellowgreen" : "seagreen",
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        mesh.position.x = -5 + 0.5 + i;
        mesh.position.z = -5 + 0.5 + j;
        group.add(mesh);
      }
    }

    this.scene.add(group);

    return group;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

export default WorldRenderer;
