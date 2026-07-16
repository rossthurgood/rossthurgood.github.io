import * as THREE from "three";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger.js";

import { createProceduralPlanet, generateSeed, sanitizeSeed, getSeedFromURL } from "./src/planetgenerator.js";
import { buildNarrativeOverlay, NARRATIVE } from "./src/narrative.js";

gsap.registerPlugin(ScrollTrigger);

/* -------------------------
   Guards & fallbacks
   ------------------------- */

function webglAvailable() {
    try {
        const c = document.createElement("canvas");
        return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) {
        return false;
    }
}

const container = document.querySelector("#scene-container");
const loadingScreen = document.querySelector("#loading-screen");
const loadingProgress = document.querySelector("#loading-progress");
const narrativeRoot = document.querySelector("#narrative-layer");
const webglFallback = document.querySelector("#webgl-fallback");

if (!container) {
    throw new Error("Missing #scene-container element");
}

if (!webglAvailable()) {
    if (webglFallback) webglFallback.hidden = false;
    if (loadingScreen) loadingScreen.classList.add("hidden");
    throw new Error("WebGL not available");
}

const IS_MOBILE = window.matchMedia("(max-width: 768px)").matches;

/* -------------------------
   Loading manager
   ------------------------- */

const loadingManager = new THREE.LoadingManager();
let loadingDone = false;

function hideLoading() {
    if (loadingDone || !loadingScreen) return;
    loadingDone = true;
    loadingScreen.classList.add("hidden");
}

loadingManager.onProgress = (url, loaded, total) => {
    if (loadingProgress && total > 0) {
        loadingProgress.textContent = `${Math.round((loaded / total) * 100)}%`;
    }
};
loadingManager.onLoad = hideLoading;
loadingManager.onError = (url) => console.warn("Asset failed to load (fallback applied):", url);

// Safety: never leave the user stuck on the loader.
setTimeout(hideLoading, 9000);

const gltfloader = new GLTFLoader(loadingManager);
const texloader = new THREE.TextureLoader(loadingManager);

function loadTexture(path, onFail) {
    return texloader.load(path, undefined, undefined, () => {
        if (onFail) onFail();
    });
}

/* -------------------------
   Scene setup
   ------------------------- */

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 0.25, 14);

const renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x02030b, 1);
container.appendChild(renderer.domElement);
renderer.domElement.style.position = "absolute";
renderer.domElement.style.inset = "0";
renderer.domElement.style.zIndex = "1";
scene.background = null;

scene.add(new THREE.AmbientLight(0xffffff, 0.75));

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

/* -------------------------
   Journey constants
   ------------------------- */

function offscreenRightX(margin = 3.5) {
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
    const halfWidth = halfHeight * camera.aspect;
    return halfWidth + margin;
}

const VIEW_RIGHT = Math.max(offscreenRightX(), 10);
const VIEW_LEFT = -30;

const SHIP_X = -2.8;
const FLIGHT_Y = -0.2;
const FLIGHT_Z = 0;

const SHIP_FACING = Math.PI / 2;

const PLANET_CENTER_X = 0;
const ORBIT_RADIUS = Math.abs(SHIP_X - PLANET_CENTER_X);

/* -------------------------
   World seed + procedural final planet
   ------------------------- */

const worldSeed = getSeedFromURL() || generateSeed();
const { group: finalPlanet, metadata: worldMeta } = createProceduralPlanet(worldSeed);
finalPlanet.position.set(VIEW_RIGHT, FLIGHT_Y, FLIGHT_Z);
scene.add(finalPlanet);
console.log("[One Last Signal] world:", worldMeta);

const atmoMat = finalPlanet.userData.atmosphereMaterial;
const revealTint = worldMeta.habitable
    ? new THREE.Color(0.45, 1.0, 0.72)
    : new THREE.Color(1.0, 0.32, 0.22);

/* Seed HUD */
const seedInput = document.querySelector("#seed-input");
const seedApply = document.querySelector("#seed-apply");
if (seedInput) seedInput.value = worldMeta.seed;

function applySeed() {
    if (!seedInput) return;
    const next = sanitizeSeed(seedInput.value) || generateSeed();
    const url = new URL(window.location.href);
    url.searchParams.set("seed", next);
    window.location.href = url.toString();
}

if (seedApply) seedApply.addEventListener("click", applySeed);
if (seedInput) {
    seedInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") applySeed();
    });
}

/* Ambient audio hook (drop audio/ambient.mp3 in place to enable) */
const audioToggle = document.querySelector("#audio-toggle");
if (audioToggle) {
    const ambient = new Audio("audio/ambient.mp3");
    ambient.loop = true;
    ambient.volume = 0.35;
    let audioOn = false;

    audioToggle.addEventListener("click", () => {
        if (audioOn) {
            ambient.pause();
            audioOn = false;
            audioToggle.textContent = "SOUND: OFF";
            audioToggle.setAttribute("aria-pressed", "false");
        } else {
            ambient.play().then(() => {
                audioOn = true;
                audioToggle.textContent = "SOUND: ON";
                audioToggle.setAttribute("aria-pressed", "true");
            }).catch(() => {
                audioToggle.textContent = "NO AUDIO FILE";
                setTimeout(() => { audioToggle.textContent = "SOUND: OFF"; }, 2200);
            });
        }
    });
}

/* -------------------------
   Star field
   ------------------------- */

const starGeometry = new THREE.BufferGeometry();
const starCount = IS_MOBILE ? 400 : 700;
const starPositions = new Float32Array(starCount * 3);

for (let i = 0; i < starPositions.length; i += 3) {
    starPositions[i] = (Math.random() - 0.5) * 40;
    starPositions[i + 1] = (Math.random() - 0.5) * 20;
    starPositions[i + 2] = (Math.random() - 0.5) * 120;
}

starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));

const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0.85,
    map: loadTexture("textures/star.png", () => { starMaterial.map = null; starMaterial.needsUpdate = true; })
});
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

/* -------------------------
   Earth
   ------------------------- */

const earthMaterial = new THREE.MeshStandardMaterial({
    map: loadTexture("textures/deadearth.png", () => {
        earthMaterial.map = null;
        earthMaterial.color.set(0x4a4f55);
        earthMaterial.needsUpdate = true;
    }),
    roughness: 0.65,
    metalness: 0.05
});

const earth = new THREE.Mesh(new THREE.SphereGeometry(2.0, 64, 64), earthMaterial);
earth.position.set(-4.2, -0.55, -0.5);
scene.add(earth);

/* -------------------------
   Ship (.GLB with primitive fallback)
   ------------------------- */

const ship = new THREE.Group();
ship.position.set(SHIP_X, FLIGHT_Y, FLIGHT_Z);
ship.rotation.y = SHIP_FACING;
ship.scale.set(0.0167, 0.0167, 0.0167);
scene.add(ship);

function buildFallbackShip() {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(
        new THREE.ConeGeometry(4, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.5, metalness: 0.6 })
    );
    hull.rotation.x = Math.PI / 2;
    const fin = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0x8a8f99, roughness: 0.6, metalness: 0.5 })
    );
    fin.position.set(0, 2, -5);
    g.add(hull, fin);
    return g;
}

gltfloader.load(
    "spaceship.glb",
    (gltf) => ship.add(gltf.scene),
    undefined,
    (error) => {
        console.warn("Spaceship model failed, using fallback:", error);
        ship.add(buildFallbackShip());
    }
);

camera.lookAt(ship.position);

/* -------------------------
   Planets
   ------------------------- */

const planet1Material = new THREE.MeshStandardMaterial({
    map: loadTexture("textures/rocky.jpg", () => {
        planet1Material.map = null;
        planet1Material.color.set(0x8a7f72);
        planet1Material.needsUpdate = true;
    }),
    roughness: 0.65,
    metalness: 0.05,
    transparent: true
});
const planet1 = new THREE.Mesh(new THREE.SphereGeometry(2.0, 42, 42), planet1Material);
planet1.position.set(VIEW_RIGHT, FLIGHT_Y, FLIGHT_Z);
scene.add(planet1);

const planet2Material = new THREE.MeshStandardMaterial({
    map: loadTexture("textures/gassy.jpg", () => {
        planet2Material.map = null;
        planet2Material.color.set(0xb08a5a);
        planet2Material.needsUpdate = true;
    }),
    roughness: 0.65,
    metalness: 0.05,
    transparent: true
});
const planet2 = new THREE.Mesh(new THREE.SphereGeometry(2.0, 64, 64), planet2Material);
planet2.position.set(VIEW_RIGHT, FLIGHT_Y, FLIGHT_Z);
scene.add(planet2);

/* -------------------------
   Asteroid belt
   ------------------------- */

function createBaseAsteroidGeometry(size) {
    const geo = new THREE.IcosahedronGeometry(size, 1);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(
            i,
            pos.getX(i) + (Math.random() - 0.5) * size * 0.4,
            pos.getY(i) + (Math.random() - 0.5) * size * 0.4,
            pos.getZ(i) + (Math.random() - 0.5) * size * 0.4
        );
    }

    geo.computeVertexNormals();
    return geo;
}

function createAsteroidBelt({ count = 250, radius = 3.5, width = 2.5, minSize = 0.04, maxSize = 0.18, y = 0 }) {
    const baseGeo = createBaseAsteroidGeometry(1);
    const mat = new THREE.MeshStandardMaterial({
        color: 0xbfc1c2,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 1
    });

    const instancedMesh = new THREE.InstancedMesh(baseGeo, mat, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
        const size = THREE.MathUtils.lerp(minSize, maxSize, Math.random());
        dummy.scale.set(size, size, size);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        const angle = Math.random() * Math.PI * 2;
        const dist = radius + (Math.random() - 0.5) * width;

        dummy.position.set(
            (Math.random() - 0.5) * 1.2,
            Math.cos(angle) * dist + y,
            Math.sin(angle) * dist
        );

        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    return instancedMesh;
}

const asteroidBelt = createAsteroidBelt({
    count: IS_MOBILE ? 140 : 250,
    radius: 3.5,
    width: 2.5,
    minSize: 0.04,
    maxSize: 0.18,
    y: FLIGHT_Y
});
scene.add(asteroidBelt);

const asteroidMaterials = asteroidBelt.material;

/* -------------------------
   Station (.GLB with primitive fallback)
   ------------------------- */

const station = new THREE.Group();
station.position.set(VIEW_RIGHT, FLIGHT_Y, FLIGHT_Z);
station.rotation.y = SHIP_FACING;
station.scale.set(0.15, 0.15, 0.15);
scene.add(station);

const stationMaterials = [];

function buildFallbackStation() {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x9aa0aa, roughness: 0.55, metalness: 0.5, transparent: true })
    );
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(7, 0.9, 10, 32),
        new THREE.MeshStandardMaterial({ color: 0x7d828c, roughness: 0.6, metalness: 0.5, transparent: true })
    );
    ring.rotation.x = Math.PI / 2;
    g.add(core, ring);
    return g;
}

function collectStationMaterials(root) {
    root.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.transparent = true;
            child.material.opacity = 1;
            stationMaterials.push(child.material);
        }
    });
}

gltfloader.load(
    "satelite.glb",
    (gltf) => {
        collectStationMaterials(gltf.scene);
        station.add(gltf.scene);
    },
    undefined,
    (error) => {
        console.warn("Station model failed, using fallback:", error);
        const fallback = buildFallbackStation();
        collectStationMaterials(fallback);
        station.add(fallback);
    }
);

const stationFade = { value: 1 };
function applyStationFade() {
    stationMaterials.forEach((m) => { m.opacity = stationFade.value; });
}

// Start unused objects off-screen/invisible.
gsap.set(asteroidBelt.position, { x: VIEW_RIGHT, y: 0, z: 0 });
gsap.set(asteroidMaterials, { opacity: 0 });
gsap.set(planet1.position, { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z });
gsap.set(planet2.position, { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z });
gsap.set(station.position, { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z });
gsap.set(finalPlanet.position, { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z });
gsap.set(ship.position, { x: SHIP_X, y: FLIGHT_Y, z: FLIGHT_Z });

/* -------------------------
   Resize handler
   ------------------------- */

function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize);

/* -------------------------
   Orbit helper
   ------------------------- */

function makeScreenOrbit(planet, { radius = ORBIT_RADIUS, duration = 3, revolutions = 1, ease = "none" } = {}) {
    const orbit = { angle: Math.PI };
    const orbitTimeline = gsap.timeline();

    orbitTimeline.set(ship.position, {
        x: PLANET_CENTER_X - radius,
        y: FLIGHT_Y,
        z: FLIGHT_Z
    });

    // A whole number of turns ending back in the ship's travel lane.
    orbitTimeline.to(orbit, {
        angle: Math.PI - revolutions * Math.PI * 2,
        duration,
        ease,
        onUpdate: () => {
            const a = orbit.angle;
            ship.position.x = planet.position.x + radius * Math.cos(a);
            ship.position.z = planet.position.z + radius * Math.sin(a);
            ship.position.y = planet.position.y;
        }
    });

    orbitTimeline.set(ship.position, { x: SHIP_X, y: FLIGHT_Y, z: FLIGHT_Z });
    return orbitTimeline;
}

/* -------------------------
   Narrative overlay
   ------------------------- */

const overlay = narrativeRoot ? buildNarrativeOverlay(narrativeRoot, worldMeta) : null;

/* -------------------------
   Scroll timeline
   ------------------------- */

const timeline = gsap.timeline({
    scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "+=15500",
        scrub: 1
    }
});

const STAR_RATE = 0.6;
const starDrift = (d) => ({ x: `-=${d * STAR_RATE}`, ease: "none", duration: d });

timeline
    // 0. Intro hint fades as the journey starts.
    .to("#intro-text", { autoAlpha: 0, duration: 0.5, ease: "none" }, 0.05)

    // 1. Leave Earth.
    .addLabel("leaveEarth", 0)
    .to(ship.scale, { x: 0.3, y: 0.3, z: 0.3, duration: 1.4, ease: "none" }, "leaveEarth")
    .to(earth.position, { x: VIEW_LEFT - 8, duration: 2.2, ease: "none" }, "leaveEarth")
    .to(earth.scale, { x: 0.3, y: 0.3, z: 0.3, duration: 2.2, ease: "none" }, "leaveEarth")
    .to(stars.position, starDrift(2.2), "leaveEarth")

    // 2. Asteroid belt crosses.
    .addLabel("asteroids", ">")
    .to(asteroidMaterials, { opacity: 1, duration: 0.8, ease: "none" }, "asteroids")
    .to(asteroidBelt.position, { x: VIEW_LEFT, duration: 4.2, ease: "none" }, "asteroids")
    .to(asteroidBelt.rotation, { x: "+=0.8", duration: 4.2, ease: "none" }, "asteroids")
    .to(asteroidMaterials, { opacity: 0, duration: 0.8, ease: "none" }, ">-0.8")
    .to(stars.position, starDrift(4.2), "asteroids")

    // 3. Planet 1 enters.
    .addLabel("planet1Enter", ">")
    .fromTo(
        planet1.position,
        { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z },
        { x: PLANET_CENTER_X, y: FLIGHT_Y, z: FLIGHT_Z, duration: 4, ease: "none" },
        "planet1Enter"
    )
    .to(stars.position, starDrift(4), "planet1Enter")

    // 4. Orbit planet 1.
    .addLabel("orbit1", ">")
    .add(makeScreenOrbit(planet1, { duration: 4 }), "orbit1")

    // 5. Planet 1 recedes.
    .addLabel("planet1Exit", ">")
    .to(planet1.position, { x: VIEW_LEFT, duration: 3.5, ease: "none" }, "planet1Exit")
    .to(planet1.position, { z: -55, duration: 1.6, ease: "none" }, "planet1Exit")
    .to(planet1.material, { opacity: 0, duration: 2.2, ease: "none" }, "planet1Exit")
    .to(stars.position, starDrift(3.5), "planet1Exit")

    // 6. Planet 2 enters.
    .addLabel("planet2Enter", ">")
    .fromTo(
        planet2.position,
        { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z },
        { x: PLANET_CENTER_X, y: FLIGHT_Y, z: FLIGHT_Z, duration: 4, ease: "none" },
        "planet2Enter"
    )
    .to(stars.position, starDrift(4), "planet2Enter")

    // 7. Orbit planet 2.
    .addLabel("orbit2", ">")
    .add(makeScreenOrbit(planet2, { duration: 4 }), "orbit2")

    // 8. Planet 2 recedes.
    .addLabel("planet2Exit", ">")
    .to(planet2.position, { x: VIEW_LEFT, duration: 3.5, ease: "none" }, "planet2Exit")
    .to(planet2.position, { z: -55, duration: 1.6, ease: "none" }, "planet2Exit")
    .to(planet2.material, { opacity: 0, duration: 2.2, ease: "none" }, "planet2Exit")
    .to(stars.position, starDrift(3.5), "planet2Exit")

    // 9. Station enters.
    .addLabel("stationEnter", ">")
    .fromTo(
        station.position,
        { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z },
        { x: PLANET_CENTER_X, y: FLIGHT_Y, z: FLIGHT_Z, duration: 4, ease: "none" },
        "stationEnter"
    )
    .to(stars.position, starDrift(4), "stationEnter")

    // 10. Orbit station.
    .addLabel("orbitStation", ">")
    .add(makeScreenOrbit(station, { duration: 4 }), "orbitStation")

    // 11. Station recedes (fades all its materials, GLB or fallback).
    .addLabel("stationExit", ">")
    .to(station.position, { x: VIEW_LEFT, duration: 3.5, ease: "none" }, "stationExit")
    .to(station.position, { z: -55, duration: 1.6, ease: "none" }, "stationExit")
    .to(stationFade, { value: 0, duration: 2.2, ease: "none", onUpdate: applyStationFade }, "stationExit")
    .to(stars.position, starDrift(3.5), "stationExit")

    // 12. The final planet — procedural, unique to this seed.
    .addLabel("finalEnter", ">")
    .fromTo(
        finalPlanet.position,
        { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z },
        { x: PLANET_CENTER_X, y: FLIGHT_Y, z: FLIGHT_Z, duration: 4, ease: "none" },
        "finalEnter"
    )
    .to(stars.position, starDrift(4), "finalEnter")

    // 13. One slow, eased orbit of the final planet.
    .addLabel("finalOrbit", ">")
    .add(makeScreenOrbit(finalPlanet, { duration: 5, ease: "power1.inOut" }), "finalOrbit")

    // 14. Reveal: the planet closes in, atmosphere flares with the habitability verdict.
    .addLabel("finalReveal", ">")
    .to(finalPlanet.position, { z: 2.2, y: FLIGHT_Y - 0.3, duration: 2.5, ease: "power1.inOut" }, "finalReveal")
    .to(finalPlanet.scale, { x: 1.18, y: 1.18, z: 1.18, duration: 2.5, ease: "power1.inOut" }, "finalReveal")
    .to(ship.position, { x: SHIP_X - 2.2, y: FLIGHT_Y - 1.4, duration: 2.5, ease: "power1.inOut" }, "finalReveal")
    .to(atmoMat.uniforms.uIntensity, { value: 1.7, duration: 2.5, ease: "none" }, "finalReveal")
    .to(atmoMat.uniforms.uColor.value, { r: revealTint.r, g: revealTint.g, b: revealTint.b, duration: 2.5, ease: "none" }, "finalReveal")

    // 15. Hold on the unresolved ending.
    .addLabel("endHold", ">")
    .to({}, { duration: 2.5 });

/* Narrative beats: scrubbed fades pinned to the labels above. */
if (overlay) {
    NARRATIVE.forEach((beat) => {
        const el = overlay.beats.get(beat.id);
        if (!el) return;
        timeline
            .to(el, { autoAlpha: 1, y: 0, duration: 0.6, ease: "none", startAt: { y: 24 } }, beat.at)
            .to(el, { autoAlpha: 0, y: -18, duration: 0.6, ease: "none" }, `>+=${beat.hold}`);
    });

    // Ending stays on screen once revealed.
    timeline.to(
        overlay.endingEl,
        { autoAlpha: 1, duration: 1.2, ease: "none", startAt: { y: 20 } },
        "finalReveal+=1.1"
    );
}

/* -------------------------
   Animation loop
   ------------------------- */

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const elapsed = clock.elapsedTime;

    ship.rotation.x = Math.sin(elapsed * 1.2) * 0.03;
    stars.rotation.y += 0.00005;
    asteroidBelt.rotation.x += 0.0008;

    earth.rotation.y += 0.0004;
    planet1.rotation.y += 0.0006;
    planet2.rotation.y += 0.001;
    station.rotation.y += 0.0012;

    if (finalPlanet.userData.tick) finalPlanet.userData.tick(dt);

    renderer.render(scene, camera);
}

animate();
