import * as THREE from 'https://unpkg.com/three/build/three.module.js';
import gsap from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js';
import { ScrollTrigger } from 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js'
import { GLTFLoader } from 'https://unpkg.com/three/examples/jsm/loaders/GLTFLoader.js';

gsap.registerPlugin(ScrollTrigger);

const gltfloader = new GLTFLoader();

const container = document.querySelector('#scene-container');
if (!container) {
	throw new Error('Missing #scene-container element');
}
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0.25, 6.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x02030b, 1);
container.appendChild(renderer.domElement);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.inset = '0';
renderer.domElement.style.zIndex = '1';
scene.background = null;

const introText = document.querySelector('#intro-text');
if (introText) {
	introText.textContent = 'Scroll down to traverse new space';
	introText.style.zIndex = '2';
}

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

const starGeometry = new THREE.BufferGeometry();
const starCount = 700;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starPositions.length; i += 3) {
starPositions[i] = (Math.random() - 0.5) * 40;
starPositions[i + 1] = (Math.random() - 0.5) * 20;
starPositions[i + 2] = (Math.random() - 0.5) * 120;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(
	starGeometry,
	new THREE.PointsMaterial({ 
		color: 0xffffff, 
		size: 0.15, 
		transparent: true, 
		opacity: 0.85,
		map: new THREE.TextureLoader().load("textures/star.png")
	})
);
scene.add(stars);

const earth = new THREE.Mesh(
new THREE.SphereGeometry(2.0, 64, 64),
new THREE.MeshStandardMaterial({ 
	map: new THREE.TextureLoader().load("textures/deadearth.png"),
	roughness: 0.65, 
	metalness: 0.05 
})
);
earth.position.set(-2.5, -0.2, 0);
scene.add(earth);

const ship = new THREE.Group();
const shipBody = new THREE.Mesh(
new THREE.CylinderGeometry(0.12, 0.12, 1.6, 14),
new THREE.MeshStandardMaterial({ color: 0xe6e6e6, metalness: 0.4, roughness: 0.3 })
);
shipBody.rotateZ(Math.PI / 2);
ship.add(shipBody);

const shipNose = new THREE.Mesh(
new THREE.ConeGeometry(0.12, 0.45, 12),
new THREE.MeshStandardMaterial({ color: 0xfff3ba, metalness: 0.3, roughness: 0.4 })
);
shipNose.rotateZ(Math.PI / 2);
shipNose.position.set(0.95, 0, 0);
ship.add(shipNose);

const wingGeometry = new THREE.BoxGeometry(0.05, 0.5, 0.2);
const wingMaterial = new THREE.MeshStandardMaterial({ color: 0xd1d1d1, roughness: 0.4 });
const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
leftWing.position.set(0, -0.16, -0.3);
leftWing.rotateX(Math.PI / 5);
ship.add(leftWing);

const rightWing = leftWing.clone();
rightWing.position.set(0, -0.16, 0.3);
ship.add(rightWing);

ship.position.set(-2.5, -0.2, 0);
ship.scale.set(0.3, 0.3, 0.3);
scene.add(ship);

const planet1 = new THREE.Mesh(
new THREE.SphereGeometry(2.0, 64, 64),
new THREE.MeshStandardMaterial({ 
	color: 0x06abab,
	roughness: 0.65, 
	metalness: 0.05 
})
);
planet1.position.set(15, -0.2, 0);
scene.add(planet1);

const planet2 = new THREE.Mesh(
new THREE.SphereGeometry(2.0, 64, 64),
new THREE.MeshStandardMaterial({ 
	color: 0xfd56fd,
	roughness: 0.65, 
	metalness: 0.05 
})
);
planet2.position.set(30, -0.2, 0);
scene.add(planet2);

camera.lookAt(0, 0, 0);

function resize() {
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);

const timeline = gsap.timeline({
scrollTrigger: {
trigger: document.body,
start: 'top top',
end: '+=12500',
scrub: true
}
});

timeline
.to(ship.scale, { x: 1, y: 1, z: 1, ease: 'none' }, 0)
.to(earth.position, { x: -15, ease: 'none' }, 0)
.to(earth.scale, { x: 0.3, y: 0.3, z: 0.3, ease: 'none' }, 0)
.to(planet1.position, { x: 0, ease: 'none' }, 0)
.to(planet1.position, { x: -15, ease: 'none' }, 0.75)
.to(planet2.position, { x: 0, ease: 'none' }, 1.5)
.to(planet2.position, { x: -15, ease: 'none' }, 2.25);

const clock = new THREE.Clock();

function animate() {
requestAnimationFrame(animate);
ship.rotation.x = Math.sin(clock.getElapsedTime() * 1.2) * 0.03;
renderer.render(scene, camera);
}

animate();
