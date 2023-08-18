class CoreEngine {
  constructor() {}

  getRenderingEngine() {
    return this._renderer;
  }

  getPhysicsEngine() {
    return this._simulator;
  }

  getAudioEngine() {
    return this._audioPlayer;
  }
}
