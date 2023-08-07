import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const loader = new GLTFLoader();

export async function loadLevel(url) {
    let group = new THREE.Group();
    await loader.load(
        url,
        (gltf) => {
            group.add(gltf.scene);
        },
        (progress) => {
            // console.log(progress);
        },
        (error) => {
            // console.log(error);
        }
    );

    return group;
}