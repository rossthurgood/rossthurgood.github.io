import * as THREE from "three";
import { GLTFLoader } from "jsm/loaders/GLTFLoader.js";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger.js";

gsap.registerPlugin(ScrollTrigger);

const gltfloader = new GLTFLoader();
const texloader = new THREE.TextureLoader();

function loadTexture(url) {
    return texloader.load(
        url,
        undefined,
        undefined,
        (error) => {
            console.error(`Failed to load texture "${url}":`, error);
        }
    );
}

const container = document.querySelector("#scene-container");
if (!container) {
    throw new Error("Missing #scene-container element");
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

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x02030b, 1);
container.appendChild(renderer.domElement);
renderer.domElement.style.position = "absolute";
renderer.domElement.style.inset = "0";
renderer.domElement.style.zIndex = "1";
scene.background = null;

const introText = document.querySelector("#intro-text");
if (introText) {
    introText.textContent = "Scroll down to traverse new space";
    introText.style.zIndex = "2";
}

scene.add(new THREE.AmbientLight(0xffffff, 0.75));

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

/* -------------------------
   Journey constants
   -------------------------
*/

function offscreenRightX(margin = 3.5) {
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
    const halfWidth = halfHeight * camera.aspect;
    return halfWidth + margin;
}

const VIEW_RIGHT = offscreenRightX();
const VIEW_LEFT = -30;

const SHIP_X = -2.8;
const FLIGHT_Y = -0.2;
const FLIGHT_Z = 0;

const SHIP_FACING = Math.PI / 2;

const PLANET_CENTER_X = 0;
const ORBIT_RADIUS = Math.abs(SHIP_X - PLANET_CENTER_X);

/* -------------------------
   Star field
   ------------------------- */

const starGeometry = new THREE.BufferGeometry();
const starCount = 700;
const starPositions = new Float32Array(starCount * 3);

for (let i = 0; i < starPositions.length; i += 3) {
    starPositions[i] = (Math.random() - 0.5) * 40;
    starPositions[i + 1] = (Math.random() - 0.5) * 20;
    starPositions[i + 2] = (Math.random() - 0.5) * 120;
}

starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));

const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.15,
        transparent: true,
        opacity: 0.85,
        map: loadTexture("textures/star.png")
    })
);
scene.add(stars);

/* -------------------------
   Earth
   ------------------------- */

const earth = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 64, 64),
    new THREE.MeshStandardMaterial({
        map: loadTexture("textures/deadearth.png"),
        roughness: 0.65,
        metalness: 0.05
    })
);

earth.position.set(-4.2, -0.55, -0.5);
scene.add(earth);

/* -------------------------
   Ship (.GLB loader implementation)
   ------------------------- */

const ship = new THREE.Group();
ship.position.set(SHIP_X, FLIGHT_Y, FLIGHT_Z);
ship.rotation.y = SHIP_FACING;
ship.scale.set(0.0167, 0.0167, 0.0167);
scene.add(ship);

gltfloader.load(
    "spaceship.glb",
    (gltf) => {
        const loadedModel = gltf.scene;

        ship.add(loadedModel);
    },
    undefined,
    (error) => {
        console.error("An error occurred loading the spaceship model:", error);
        if (introText) {
            introText.textContent = "Unable to load the spaceship model.";
        }
    }
);

camera.lookAt(ship.position);

/* -------------------------
   Planets
   ------------------------- */

const planet1 = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 42, 42),
    new THREE.MeshStandardMaterial({
        map: loadTexture("textures/rocky.jpg"),
        roughness: 0.65,
        metalness: 0.05,
        transparent: true
    })
);
planet1.position.set(VIEW_RIGHT, FLIGHT_Y, FLIGHT_Z);
scene.add(planet1);

const planet2 = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 64, 64),
    new THREE.MeshStandardMaterial({
        map: loadTexture("textures/gassy.jpg"),
        roughness: 0.65,
        metalness: 0.05,
        transparent: true
    })
);
planet2.position.set(VIEW_RIGHT, FLIGHT_Y, FLIGHT_Z);
scene.add(planet2);

/* -------------------------
   Asteroid belt
   ------------------------- */

function createBaseAsteroidGeometry(size) {
    const geo = new THREE.IcosahedronGeometry(size, 1);
    const pos = geo.attributes.position;
    
    for (let i = 0; i < pos.count; i++) {
        const nx = (Math.random() - 0.5) * size * 0.4;
        const ny = (Math.random() - 0.5) * size * 0.4;
        const nz = (Math.random() - 0.5) * size * 0.4;

        pos.setXYZ(
            i,
            pos.getX(i) + nx,
            pos.getY(i) + ny,
            pos.getZ(i) + nz
        );
    }
    
    geo.computeVertexNormals();
    return geo;
}

function createAsteroidBelt({
    count = 250,
    radius = 3.5,
    width = 2.5,
    minSize = 0.04,
    maxSize = 0.18,
    y = 0
}) {
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

        dummy.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

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
    count: 250,
    radius: 3.5,
    width: 2.5,
    minSize: 0.04,
    maxSize: 0.18,
    y: FLIGHT_Y
});
scene.add(asteroidBelt);

const asteroidMaterials = asteroidBelt.material;

/* -------------------------
   Station (.GLB loader implementation)
   ------------------------- */

const station = new THREE.Group();
station.position.set(VIEW_RIGHT, FLIGHT_Y, FLIGHT_Z); 
station.rotation.y = SHIP_FACING;
station.scale.set(0.0167, 0.0167, 0.0167);

scene.add(station); 

gltfloader.load(
    "satelite.glb",
    (gltf) => {
        const loadedModel = gltf.scene;
        loadedModel.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.transparent = true;
                child.material.opacity = 1;
            }
        });
        station.add(loadedModel);
    },
    undefined,
    (error) => {
        console.error("An error occurred loading the station model:", error);
    }
);

// Start unused objects off-screen/invisible.
gsap.set(asteroidBelt.position, { x: VIEW_RIGHT, y: 0, z: 0 });
gsap.set(asteroidMaterials, { opacity: 0 });
gsap.set(planet1.position, { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z });
gsap.set(planet2.position, { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z });
gsap.set(station.position, { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z });
gsap.set(planet3.position, { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z });
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
   -------------------------
*/

function makeScreenOrbit(planet, { radius = ORBIT_RADIUS, duration = 3, revolutions = 1 } = {}) {
    const orbit = {
        angle: Math.PI
    };

    const orbitTimeline = gsap.timeline();

    // Enter on the near (left) side of the planet, in the ship's travel lane.
    orbitTimeline.set(ship.position, {
        x: PLANET_CENTER_X - radius,
        y: FLIGHT_Y,
        z: FLIGHT_Z
    });

    // A whole number of turns: front -> far side -> behind -> back to the near
    // side, ending exactly where it started (its lane) so the ship never has to
    // hop back across the screen between planets.
    orbitTimeline.to(orbit, {
        angle: Math.PI - revolutions * Math.PI * 2,
        duration,
        ease: "none",
        onUpdate: () => {
            const a = orbit.angle;

            // Orbit in the horizontal X/Z plane so the ship sweeps in front of
            // and behind the planet instead of passing through it. Heading is
            // left fixed (SHIP_FACING) so the ship always faces screen-right.
            ship.position.x = planet.position.x + radius * Math.cos(a);
            ship.position.z = planet.position.z + radius * Math.sin(a);
            ship.position.y = planet.position.y;
        }
    });

    // Snap back to the exact lane position to end the orbit cleanly.
    orbitTimeline.set(ship.position, {
        x: SHIP_X,
        y: FLIGHT_Y,
        z: FLIGHT_Z
    });

    return orbitTimeline;
}

/* -------------------------
   Scroll timeline
   ------------------------- */

const timeline = gsap.timeline({
    scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "+=12500",
        scrub: 1
    }
});

// Star parallax: the field drifts slowly with the ship on the straight legs of
// the journey to sell the sense of depth, but holds still while the ship is
// circling a planet (no star tween is added over the orbit segments). Because
// every drift is part of the scrubbed timeline it reverses with the scroll.
const STAR_RATE = 0.6;
const starDrift = (d) => ({ x: `-=${d * STAR_RATE}`, ease: "none", duration: d });

timeline
    // 1. Leave Earth. Earth moves left and shrinks away.
    .addLabel("leaveEarth")
    .to(
        ship.scale,
        {
            x: 0.3,
            y: 0.3,
            z: 0.3,
            duration: 1.4,
            ease: "none"
        },
        "leaveEarth"
    )
    .to(
        earth.position,
        {
            x: VIEW_LEFT - 8,
            duration: 2.2,
            ease: "none"
        },
        "leaveEarth"
    )
    .to(
        earth.scale,
        {
            x: 0.3,
            y: 0.3,
            z: 0.3,
            duration: 2.2,
            ease: "none"
        },
        "leaveEarth"
    )
    .to(stars.position, starDrift(2.2), "leaveEarth")

    // 2. Asteroid belt comes in from the right, crosses the ship path, then exits left.
   .addLabel("asteroids", ">")
    .to(
        asteroidMaterials,
        {
            opacity: 1,
            duration: 0.8,
            ease: "none"
        },
        "asteroids"
    )
    .to(
        asteroidBelt.position,
        {
            x: VIEW_LEFT,
            duration: 4.2,
            ease: "none"
        },
        "asteroids"
    )
    .to(
        asteroidBelt.rotation,
        {
            z: "+=0.8",
            duration: 4.2,
            ease: "none"
        },
        "asteroids"
    )
    .to(
        asteroidMaterials,
        {
            opacity: 0,
            duration: 0.8,
            ease: "none"
        },
        ">-0.8"
    )
    .to(stars.position, starDrift(4.2), "asteroids")

    // 3. Planet 1 enters from the right and stops in the centre.
    .addLabel("planet1Enter", ">")
    .fromTo(
        planet1.position,
        { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z },
        {
            x: PLANET_CENTER_X,
            y: FLIGHT_Y,
            z: FLIGHT_Z,
            duration: 4,
            ease: "none"
        },
        "planet1Enter"
    )
    .to(stars.position, starDrift(4), "planet1Enter")

    // 4. Ship flies around planet 1 (front, behind, back into its lane).
    //    Stars deliberately hold still for the whole orbit.
    .add(makeScreenOrbit(planet1, { duration: 4 }), ">")

    // 5. Planet 1 is left behind: it recedes into the distance and fades, so it
    //    never passes through the ship, which stays put in its lane.
    .addLabel("planet1Exit", ">")
    .to(
        planet1.position,
        {
            x: VIEW_LEFT,
            duration: 3.5,
            ease: "none"
        },
        "planet1Exit"
    )
    .to(
        planet1.position,
        {
            z: -55,
            duration: 1.6,
            ease: "none"
        },
        "planet1Exit"
    )
    .to(
        planet1.material,
        {
            opacity: 0,
            duration: 2.2,
            ease: "none"
        },
        "planet1Exit"
    )
    .to(stars.position, starDrift(3.5), "planet1Exit")

    // 6. Planet 2 enters from the right and stops in the centre.
    .addLabel("planet2Enter", ">")
    .fromTo(
        planet2.position,
        { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z },
        {
            x: PLANET_CENTER_X,
            y: FLIGHT_Y,
            z: FLIGHT_Z,
            duration: 4,
            ease: "none"
        },
        "planet2Enter"
    )
    .to(stars.position, starDrift(4), "planet2Enter")

    // 7. Ship flies around planet 2 (front, behind, back into its lane).
    //    Stars hold still for the whole orbit.
    .add(makeScreenOrbit(planet2, { duration: 4 }), ">")

    // 8. Planet 2 is left behind: recede and fade.
    .addLabel("planet2Exit", ">")
    .to(
        planet2.position,
        {
            x: VIEW_LEFT,
            duration: 3.5,
            ease: "none"
        },
        "planet2Exit"
    )
    .to(
        planet2.position,
        {
            z: -55,
            duration: 1.6,
            ease: "none"
        },
        "planet2Exit"
    )
    .to(
        planet2.material,
        {
            opacity: 0,
            duration: 2.2,
            ease: "none"
        },
        "planet2Exit"
    )
    .to(stars.position, starDrift(3.5), "planet2Exit")

    // 9. station enters from the right and stops in the centre.
    .addLabel("stationEnter", ">")
    .fromTo(
        station.position,
        { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z },
        {
            x: PLANET_CENTER_X,
            y: FLIGHT_Y,
            z: FLIGHT_Z,
            duration: 4,
            ease: "none"
        },
        "stationEnter"
    )
    .to(stars.position, starDrift(4), "stationEnter")

    // 10. Ship flies around station (front, behind, back into its lane).
    //    Stars deliberately hold still for the whole orbit.
    .add(makeScreenOrbit(station, { duration: 4 }), ">")

    // 11. station is left behind: it recedes into the distance and fades, so it
    //    never passes through the ship, which stays put in its lane.
    .addLabel("stationExit", ">")
    .to(
        station.position,
        {
            x: VIEW_LEFT,
            duration: 3.5,
            ease: "none"
        },
        "stationExit"
    )
    .to(
        station.position,
        {
            z: -55,
            duration: 1.6,
            ease: "none"
        },
        "stationExit"
    )
    .to(
        station.material,
        {
            opacity: 0,
            duration: 2.2,
            ease: "none"
        },
        "stationExit"
    )
    .to(stars.position, starDrift(3.5), "stationExit")

    // 12. End in open space, still on the original flight path.
    .addLabel("deepSpace", ">")
    .to(stars.position, starDrift(3), "deepSpace");

/* -------------------------
   Animation loop
   ------------------------- */

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    ship.rotation.x = Math.sin(elapsed * 1.2) * 0.03;

    stars.rotation.y += 0.00005;

    asteroidBelt.rotation.z += 0.0008;
    asteroidBelt.children.forEach((a) => {
        a.rotation.z += 0.002;
        a.rotation.y += 0.001;
    });

    renderer.render(scene, camera);
}

animate();
