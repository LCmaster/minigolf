import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

class AssetManager {
  constructor() {
    this._loader = new GLTFLoader();
  }

  async loadStageModel(url, onLoad, onProgress, onError) {
    this._loader.load(url, onLoad, onProgress, onError);
  }

  async loadPlayerModel(url) {}
}

export default async function initAssetManager(gui) {
  return new AssetManager();
}
