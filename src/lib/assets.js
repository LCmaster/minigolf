import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

class AssetManager {
  constructor() {
    this._cubeTextureLoader = new THREE.CubeTextureLoader();
    this._textureLoader = new THREE.TextureLoader();
    this._audioLoader = new THREE.AudioLoader();
    this._fileLoader = new THREE.FileLoader();
    this._gltfLoader = new GLTFLoader();
  }

  async loadGltfModel(url, onLoad, onProgress, onError) {
    this._gltfLoader.load(url, onLoad, onProgress, onError);
  }

  async loadCubeMap(url) {
    return this._cubeTextureLoader
      .setPath(url)
      .load(["px.png", "nx.png", "py.png", "ny.png", "pz.png", "nz.png"]);
  }

  async loadPlayerModel(url) {}
}

export default async function initAssetManager(gui) {
  return new AssetManager();
}
