import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const gltfLoader = new GLTFLoader();

class Game {
    constructor(canvas) {
        this.parent = canvas;

        this.clock = new THREE.Clock();
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas
        });
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    init() {
        this.camera = new THREE.PerspectiveCamera(75, this.parent.offsetWidth / this.parent.offsetHeight, 0.1, 100);
        this.scene.add(this.camera);
        this.camera.position.x = 10;
        this.camera.position.y = 10;
        this.camera.position.z = 10;
        this.onResize();

        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);

        const directionnalLight = new THREE.DirectionalLight(0xffffff, .8);
        directionnalLight.castShadow = true;
        directionnalLight.position.x = 25;
        directionnalLight.position.y = 25;
        directionnalLight.position.z = -5;
        this.scene.add(directionnalLight);

        this.camera.lookAt(0, 0, 0);

        gltfLoader.load("/GolfBall.glb", (gltf) => {
            this.golfBall = gltf.scene;
            const golfBallMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0xFFFFFF),
                flatShading: true
            });

            for(let i = 0; i < this.golfBall.children.length; i++) {
                this.golfBall.children[i].castShadow = true;
                this.golfBall.children[i].material = golfBallMaterial;
            }

            this.golfBall.position.y += 1;
            this.scene.add(this.golfBall);
        });

        gltfLoader.load("/minigolfkit.glb", (gltf) => {
            const model = gltf.scene;
            const wallMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0xD75B34)
            });
            const floorMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0xA8E0B7)
            });
            for(let i = 0; i < model.children.length; i++) {
                const child = model.children[i];
                const name  = child.name;
                child.castShadow = true;
                child.receiveShadow = true;
                child.material = name.startsWith("Wall_") ? wallMaterial : floorMaterial;
                child.material = name.startsWith("Wall_") ? wallMaterial : floorMaterial;
            }

            this.scene.add(model);
        });

        this.clock.start();
    }

    update() {
        if (this.golfBall) {
            const elapsed = this.clock.getElapsedTime();
            const s = Math.sin(elapsed * 5) + 1;
            this.golfBall.position.y = 1+(Math.pow(s, .25) * Math.sign(s) * 2);
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

    start() {
        //TODO: Implement this method
    }

    pause() {
        //Todo: Implement this method
    }

    stop() {
        //Todo: Implement this method
    }

    dispose() {
        //TODO: Implement method
    }
}

export default Game;