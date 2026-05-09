import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';

const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10);
camera.position.z = 2;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;

const geometry = new THREE.IcosahedronGeometry(1, 2);
const material = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, wireframe: false });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const wirematerial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
const wiremesh = new THREE.Mesh(geometry, wirematerial);
const scale = 1.005;
wiremesh.scale.setScalar(scale);
mesh.add(wiremesh);

const hemisphereLight = new THREE.HemisphereLight(0x00ff00, 0xff69b4, 1);
scene.add(hemisphereLight);

let rotationSpeedX = (Math.random() > 0.5 ? 1 : -1) * 0.01;
let rotationSpeedY = (Math.random() > 0.5 ? 1 : -1) * 0.01;
let targetSpeedX = rotationSpeedX;
let targetSpeedY = rotationSpeedY;
let frameCount = 0;

function animate(t=0) {
    requestAnimationFrame(animate);
    frameCount++;
    
    // Change direction every 120 frames
    if (frameCount % 120 === 0) {
        targetSpeedX = (Math.random() > 0.5 ? 1 : -1) * 0.01;
        targetSpeedY = (Math.random() > 0.5 ? 1 : -1) * 0.01;
    }
    
    // Smoothly ease towards target speed
    rotationSpeedX += (targetSpeedX - rotationSpeedX) * 0.05;
    rotationSpeedY += (targetSpeedY - rotationSpeedY) * 0.05;
    
    mesh.rotation.x += rotationSpeedX;
    mesh.rotation.y += rotationSpeedY;
    //mesh.scale.setScalar(1 + 0.5 * Math.sin(Date.now() * 0.001));
    renderer.render(scene, camera);
    controls.update();
}
animate();