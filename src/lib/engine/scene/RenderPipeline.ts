/**
 * RenderPipeline.ts
 * High-performance pure Three.js renderer, camera, and lighting setup.
 */

import * as THREE from "three";
import { ParkBackdrop } from "./ParkBackdrop";

export class RenderPipeline {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public parkBackdrop: ParkBackdrop;

  private canvas?: HTMLCanvasElement;
  private headless: boolean = false;
  private width: number = 0;
  private height: number = 0;

  constructor(canvas?: HTMLCanvasElement, options?: { headless?: boolean }) {
    this.canvas = canvas;
    this.headless = options?.headless ?? !canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#9be0ff"); // Cheerful sunlit sky
    this.scene.fog = new THREE.Fog("#9be0ff", 70, 145);

    this.parkBackdrop = new ParkBackdrop(this.scene);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
    this.camera.position.set(0, 12, 16);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup (bypassed in headless mode for deterministic testing)
    if (this.headless) {
      const dummyDom = this.canvas || ({
        addEventListener: () => {},
        removeEventListener: () => {},
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
        style: {},
      } as unknown as HTMLCanvasElement);

      this.renderer = {
        domElement: dummyDom,
        render: () => {},
        setSize: () => {},
        setPixelRatio: () => {},
        dispose: () => {},
        shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap },
      } as unknown as THREE.WebGLRenderer;
    } else {
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
    }

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
    const parent = this.canvas?.parentElement;
    if (!parent) return;

    this.width = parent.clientWidth || (typeof window !== "undefined" ? window.innerWidth : 800);
    this.height = parent.clientHeight || (typeof window !== "undefined" ? window.innerHeight : 600);

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height, false);
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    this.renderer.setPixelRatio(Math.min(dpr, 2));
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.parkBackdrop.dispose();
    this.renderer.dispose();
    this.scene.clear();
  }
}

