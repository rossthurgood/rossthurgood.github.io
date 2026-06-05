import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/loaders/GLTFLoader.js";

import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js";
import { ScrollTrigger } from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js";

gsap.registerPlugin(ScrollTrigger);

// Kept from your original file in case you later swap the built ship for a GLTF model.
const gltfloader = new GLTFLoader();
const texloader = new THREE.TextureLoader();

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
camera.position.set(0, 0.25, 6.5);

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
   The ship stays on this normal flight path except during planet orbits.
   Planets and asteroid belt move from right to left to create forward travel.
*/

const VIEW_RIGHT = 10;
const VIEW_LEFT = -10;

const SHIP_X = -2.8;
const FLIGHT_Y = -0.2;
const FLIGHT_Z = 0;

// Planet stops at x = 0. Radius is chosen so the left side of the orbit
// matches the ship's normal flight path at x = SHIP_X.
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
        map: texloader.load("textures/star.png")
    })
);
scene.add(stars);

/* -------------------------
   Earth
   ------------------------- */

const earth = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 64, 64),
    new THREE.MeshStandardMaterial({
        map: texloader.load("textures/deadearth.png"),
        roughness: 0.65,
        metalness: 0.05
    })
);

// Earth starts partly behind/left of the ship, then exits left.
earth.position.set(-4.2, -0.55, -0.5);
scene.add(earth);

/* -------------------------
   Ship
   ------------------------- */

const ship = new THREE.Group();

const shipBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 1.6, 14),
    new THREE.MeshStandardMaterial({
        color: 0xe6e6e6,
        metalness: 0.4,
        roughness: 0.3
    })
);
shipBody.rotateZ(Math.PI / 2);
ship.add(shipBody);

const shipNose = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.45, 12),
    new THREE.MeshStandardMaterial({
        color: 0xfff3ba,
        metalness: 0.3,
        roughness: 0.4
    })
);
shipNose.rotateZ(Math.PI / 2);
shipNose.position.set(0.95, 0, 0);
ship.add(shipNose);

const wingGeometry = new THREE.BoxGeometry(0.05, 0.5, 0.2);
const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d1d1,
    roughness: 0.4
});

const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
leftWing.position.set(0, -0.16, -0.3);
leftWing.rotateX(Math.PI / 5);
ship.add(leftWing);

const rightWing = leftWing.clone();
rightWing.position.set(0, -0.16, 0.3);
ship.add(rightWing);

ship.position.set(SHIP_X, FLIGHT_Y, FLIGHT_Z);
ship.scale.set(0.3, 0.3, 0.3);
scene.add(ship);

camera.lookAt(ship.position);

/* -------------------------
   Planets
   ------------------------- */

const planet1 = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 64, 64),
    new THREE.MeshStandardMaterial({
        map: texloader.load("textures/rocky.jpg"),
        roughness: 0.65,
        metalness: 0.05
    })
);
planet1.position.set(VIEW_RIGHT, FLIGHT_Y, FLIGHT_Z);
scene.add(planet1);

const planet2 = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 64, 64),
    new THREE.MeshStandardMaterial({
        color: 0xfd56fd,
        roughness: 0.65,
        metalness: 0.05
    })
);
planet2.position.set(VIEW_RIGHT, FLIGHT_Y, FLIGHT_Z);
scene.add(planet2);

/* -------------------------
   Asteroid belt
   ------------------------- */

function createAsteroid(size) {
    const geo = new THREE.IcosahedronGeometry(size, 1);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const nx = (Math.random() - 0.5) * size * 0.6;
        const ny = (Math.random() - 0.5) * size * 0.6;
        const nz = (Math.random() - 0.5) * size * 0.6;

        pos.setXYZ(
            i,
            pos.getX(i) + nx,
            pos.getY(i) + ny,
            pos.getZ(i) + nz
        );
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
        color: 0xbfc1c2,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: 1
    });

    return new THREE.Mesh(geo, mat);
}

function createAsteroidBelt({
    count = 250,
    radius = 3.5,
    width = 2.5,
    minSize = 0.04,
    maxSize = 0.18,
    y = 0
}) {
    const group = new THREE.Group();

    for (let i = 0; i < count; i++) {
        const size = THREE.MathUtils.lerp(minSize, maxSize, Math.random());
        const asteroid = createAsteroid(size);

        const angle = Math.random() * Math.PI * 2;
        const dist = radius + (Math.random() - 0.5) * width;

        // Vertical ring facing the direction of travel.
        // The belt itself moves right to left, so the ship appears to pass through it.
        asteroid.position.set(
            (Math.random() - 0.5) * 1.2,
            Math.cos(angle) * dist + y,
            Math.sin(angle) * dist
        );

        asteroid.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        group.add(asteroid);
    }

    return group;
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

const asteroidMaterials = asteroidBelt.children
    .map((a) => a.material)
    .filter((m) => m && m.transparent === true);

// Start unused objects off-screen/invisible.
gsap.set(asteroidBelt.position, { x: VIEW_RIGHT, y: 0, z: 0 });
gsap.set(asteroidMaterials, { opacity: 0 });
gsap.set(planet1.position, { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z });
gsap.set(planet2.position, { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z });
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
   Important fixes:
   1. The orbit uses X/Y, not X/Z, so it is visible on screen.
   2. The orbit is returned as a child timeline instead of being injected later.
   3. The ship returns exactly to its normal flight path after orbiting.
*/

function makeScreenOrbit(planet, { radius = ORBIT_RADIUS, duration = 3 } = {}) {
    const orbit = {
        // Start at the left side of the planet, which matches the normal ship path.
        angle: Math.PI
    };

    const orbitTimeline = gsap.timeline();

    orbitTimeline.set(ship.position, {
        x: planet.position.x - radius,
        y: planet.position.y,
        z: FLIGHT_Z
    });

    orbitTimeline.to(orbit, {
        angle: Math.PI + Math.PI * 2,
        duration,
        ease: "none",
        onUpdate: () => {
            const a = orbit.angle;

            ship.position.x = planet.position.x + radius * Math.cos(a);
            ship.position.y = planet.position.y + radius * Math.sin(a);
            ship.position.z = FLIGHT_Z;

            // The ship model points along +X, so rotate it to face the tangent.
            const tangentX = -Math.sin(a);
            const tangentY = Math.cos(a);
            ship.rotation.z = Math.atan2(tangentY, tangentX);
        }
    });

    orbitTimeline.set(ship.position, {
        x: SHIP_X,
        y: FLIGHT_Y,
        z: FLIGHT_Z
    });

    orbitTimeline.set(ship.rotation, {
        z: 0
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

timeline
    // 1. Leave Earth. Earth moves left and shrinks away.
    .addLabel("leaveEarth")
    .to(
        ship.scale,
        {
            x: 1,
            y: 1,
            z: 1,
            duration: 1.4,
            ease: "none"
        },
        "leaveEarth"
    )
    .to(
        earth.position,
        {
            x: VIEW_LEFT - 4,
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

    // 2. Asteroid belt comes in from the right, crosses the ship path, then exits left.
    .addLabel("asteroids", ">")
    .to(
        asteroidMaterials,
        {
            opacity: 1,
            duration: 0.8,
            stagger: 0.001,
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
            y: "+=0.8",
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
            stagger: 0.001,
            ease: "none"
        },
        ">-0.8"
    )

    // 3. Planet 1 enters from the right and stops in the centre.
    .addLabel("planet1Enter", ">")
    .fromTo(
        planet1.position,
        { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z },
        {
            x: PLANET_CENTER_X,
            y: FLIGHT_Y,
            z: FLIGHT_Z,
            duration: 2.2,
            ease: "none"
        },
        "planet1Enter"
    )

    // 4. Ship orbits planet 1 once anticlockwise.
    .add(makeScreenOrbit(planet1, { duration: 3 }), ">")

    // 5. Planet 1 leaves through the left.
    .to(
        planet1.position,
        {
            x: VIEW_LEFT,
            duration: 2.2,
            ease: "none"
        },
        ">"
    )

    // 6. Planet 2 enters from the right and stops in the centre.
    .addLabel("planet2Enter", ">")
    .fromTo(
        planet2.position,
        { x: VIEW_RIGHT, y: FLIGHT_Y, z: FLIGHT_Z },
        {
            x: PLANET_CENTER_X,
            y: FLIGHT_Y,
            z: FLIGHT_Z,
            duration: 2.2,
            ease: "none"
        },
        "planet2Enter"
    )

    // 7. Ship orbits planet 2 once anticlockwise.
    .add(makeScreenOrbit(planet2, { duration: 3 }), ">")

    // 8. Planet 2 leaves through the left.
    .to(
        planet2.position,
        {
            x: VIEW_LEFT,
            duration: 2.2,
            ease: "none"
        },
        ">"
    )

    // 9. End in open space, following the original flight path.
    .addLabel("deepSpace", ">")
    .to(
        stars.position,
        {
            x: "-=5",
            duration: 3,
            ease: "none"
        },
        "deepSpace"
    )
    .to(
        ship.position,
        {
            x: SHIP_X,
            y: FLIGHT_Y,
            z: FLIGHT_Z,
            duration: 3,
            ease: "none"
        },
        "deepSpace"
    );

/* -------------------------
   Animation loop
   ------------------------- */

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    // Subtle ship bob. This only affects x-rotation, so it does not fight the orbit z-rotation.
    ship.rotation.x = Math.sin(elapsed * 1.2) * 0.03;

    // Gentle background motion.
    stars.rotation.y += 0.00005;

    // Subtle belt rotation and asteroid spins.
    asteroidBelt.rotation.y += 0.0008;
    asteroidBelt.children.forEach((a) => {
        a.rotation.x += 0.002;
        a.rotation.y += 0.001;
    });

    renderer.render(scene, camera);
}

animate();
