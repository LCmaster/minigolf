import * as THREE from "three";
class Timer {
    constructor() {
        this.clock = new THREE.Clock();
        this.deltaTime = 0;
        this.elapsed = 0;
    }

    start() {
        this.clock.start();
    }

    tick() {
        const elapsed = this.clock.getElapsedTime();

        this.deltaTime = (elapsed - this.elapsed);
        this.elapsed = elapsed;
    }
}

export default Timer;