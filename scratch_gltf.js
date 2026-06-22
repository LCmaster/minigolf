import fs from 'fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const rampShape = new THREE.Shape();
rampShape.moveTo(-1, 0);
rampShape.lineTo(1, 0);
rampShape.lineTo(1, 1);
rampShape.lineTo(-1, 0);

const extrudeSettings = { depth: 2, bevelEnabled: false };
const geometry = new THREE.ExtrudeGeometry(rampShape, extrudeSettings);
geometry.center(); // Center the geometry

const material = new THREE.MeshStandardMaterial({ color: 0x567d46 });
const mesh = new THREE.Mesh(geometry, material);

// Wait, we want the node to be named "Wall" or "Ramp" so that Block.svelte can detect it!
// If it starts with "wall", it gets wallMaterial. If ground, groundMaterial.
// Wait, Block.svelte defaults to groundMaterial for any unnamed/unmatched nodes!
mesh.name = "RampMesh";

const scene = new THREE.Scene();
scene.add(mesh);

const exporter = new GLTFExporter();
exporter.parse(
  scene,
  (gltf) => {
    fs.writeFileSync('./static/block/ramp/1.gltf', JSON.stringify(gltf));
    console.log('Saved 1.gltf');
  },
  (err) => {
    console.error(err);
  },
  { binary: false }
);
