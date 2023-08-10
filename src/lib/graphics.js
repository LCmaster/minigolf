import * as THREE from "three";

class WorldRenderer {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  createRedBox() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: "red" });
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);

    return mesh;
  }

  createFloor() {
    const geometry = new THREE.BoxGeometry(50, 0.5, 50);
    const material = new THREE.MeshBasicMaterial({ color: "yellowgreen" });
    const mesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);

    return mesh;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

export default WorldRenderer;
