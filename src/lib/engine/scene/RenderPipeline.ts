/**
 * RenderPipeline.ts
 * High-performance pure Three.js renderer, camera, and lighting setup.
 */

import * as THREE from "three";

export class RenderPipeline {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;

  private canvas: HTMLCanvasElement;
  private width: number = 0;
  private height: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#87CEEB"); // Sky blue background

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
    this.camera.position.set(0, 12, 16);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting setup
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x3a5d28, 0.5);
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.5);
    this.sunLight.position.set(16, 26, 12);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 100;
    this.sunLight.shadow.bias = -0.0005;

    const d = 25; // Shadow frustum bounds
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    this.resize();
  }

  public resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    this.width = parent.clientWidth || window.innerWidth;
    this.height = parent.clientHeight || window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.renderer.dispose();
    this.scene.clear();
  }
}

