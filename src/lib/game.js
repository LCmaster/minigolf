import * as THREE from 'three';
import {loadLevel} from "./level.js";

class Game {
    constructor(canvas) {
        this.parent = canvas;

        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas
        });
    }

    init() {
        this.camera = new THREE.PerspectiveCamera(75, this.parent.offsetWidth / this.parent.offsetHeight, 0.1, 1000);
        this.scene.add(this.camera);
        this.camera.position.x = 2.5;
        this.camera.position.y = 2.5;
        this.camera.position.z = 2.5;
        this.onResize();

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionnalLight = new THREE.DirectionalLight(0xffffff, .8);
        directionnalLight.castShadow = true;
        directionnalLight.position.x = 25;
        directionnalLight.position.y = 25;
        directionnalLight.position.z = -10;
        this.scene.add(directionnalLight);

        this.camera.lookAt(0, 0, 0);

        loadLevel("/GolfBall.glb")
            .then(model => {
                model.castShadow = true;
                model.receiveShadow = true;

                model.position.y += 1;
                this.golfBall = model;
                // console.log(model);
                this.scene.add(this.golfBall);
            });

        const floorGeometry = new THREE.BoxGeometry(100, 1, 100);
        const floorMaterial = new THREE.MeshStandardMaterial({color: "yellowgreen"});
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);

        this.scene.add(floorMesh);

        this.clock.start();
    }

    update() {
        if (this.golfBall) {
            const elapsed = this.clock.getElapsedTime();
            const s = Math.sin(elapsed*5) + 1;
            this.golfBall.position.y = 1 + (Math.pow(s, 0.5) * Math.sign(s));
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const width = this.parent.offsetWidth;
        const height = this.parent.offsetHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    dispose() {
        //TODO: Implement method
    }
}

export default Game;