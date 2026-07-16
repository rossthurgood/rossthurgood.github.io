/* Procedural final planet. Seeded, unique every load, reproducible per seed.
   Usage: const { group, metadata } = createProceduralPlanet(seed?) */

import * as THREE from "three";
import { rngFromSeed, createNoise3D, fbm } from "./noise.js";

const SEED_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSeed(length = 6) {
    let s = "";
    for (let i = 0; i < length; i++) {
        s += SEED_CHARS[Math.floor(Math.random() * SEED_CHARS.length)];
    }
    return s;
}

export function sanitizeSeed(raw) {
    if (!raw) return "";
    return String(raw).replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 12);
}

export function getSeedFromURL() {
    try {
        const params = new URLSearchParams(window.location.search);
        return sanitizeSeed(params.get("seed"));
    } catch (e) {
        return "";
    }
}

/* Biome definitions: elevation-banded palettes ([threshold, [r,g,b]]). */
const BIOMES = {
    ocean: {
        habitabilityChance: 0.65,
        cloudChance: 0.85,
        atmosphere: [0.45, 0.68, 1.0],
        palette: [
            [0.00, [8, 24, 58]],
            [0.40, [14, 48, 92]],
            [0.50, [34, 96, 126]],
            [0.53, [196, 180, 130]],
            [0.58, [64, 110, 56]],
            [0.70, [46, 82, 44]],
            [0.80, [96, 92, 80]],
            [0.90, [226, 231, 236]]
        ],
        seaLevel: 0.52
    },
    desert: {
        habitabilityChance: 0.2,
        cloudChance: 0.35,
        atmosphere: [1.0, 0.62, 0.3],
        palette: [
            [0.00, [56, 28, 18]],
            [0.30, [118, 60, 30]],
            [0.55, [176, 108, 52]],
            [0.75, [214, 164, 102]],
            [0.92, [238, 210, 162]]
        ],
        seaLevel: -1
    },
    ice: {
        habitabilityChance: 0.25,
        cloudChance: 0.5,
        atmosphere: [0.62, 0.85, 1.0],
        palette: [
            [0.00, [28, 42, 64]],
            [0.35, [88, 116, 148]],
            [0.55, [168, 194, 214]],
            [0.72, [222, 236, 244]],
            [0.90, [250, 253, 255]]
        ],
        seaLevel: 0.3
    },
    volcanic: {
        habitabilityChance: 0.08,
        cloudChance: 0.45,
        atmosphere: [1.0, 0.32, 0.18],
        palette: [
            [0.00, [18, 9, 7]],
            [0.32, [38, 26, 22]],
            [0.55, [68, 56, 52]],
            [0.80, [104, 95, 90]],
            [0.95, [128, 118, 112]]
        ],
        seaLevel: -1,
        lavaLevel: 0.3
    }
};

function paletteLookup(palette, e) {
    let lo = palette[0], hi = palette[palette.length - 1];
    for (let i = 0; i < palette.length - 1; i++) {
        if (e >= palette[i][0] && e <= palette[i + 1][0]) {
            lo = palette[i];
            hi = palette[i + 1];
            break;
        }
    }
    const span = hi[0] - lo[0] || 1;
    const t = THREE.MathUtils.clamp((e - lo[0]) / span, 0, 1);
    return [
        lo[1][0] + (hi[1][0] - lo[1][0]) * t,
        lo[1][1] + (hi[1][1] - lo[1][1]) * t,
        lo[1][2] + (hi[1][2] - lo[1][2]) * t
    ];
}

function makeCanvas(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
}

/* Generate colour / bump / roughness / emissive maps into canvases by sampling
   3D noise on the sphere surface (no seam, no pole pinch on colour data). */
function generateSurfaceMaps(rng, biomeName, biome, W = 512) {
    const H = W / 2;
    const colorC = makeCanvas(W, H), bumpC = makeCanvas(W, H);
    const roughC = makeCanvas(W, H), emisC = makeCanvas(W, H);
    const colorD = colorC.getContext("2d").createImageData(W, H);
    const bumpD = bumpC.getContext("2d").createImageData(W, H);
    const roughD = roughC.getContext("2d").createImageData(W, H);
    const emisD = emisC.getContext("2d").createImageData(W, H);

    const noise = createNoise3D(rng);
    const ox = rng() * 100, oy = rng() * 100, oz = rng() * 100;
    const continentFreq = 0.9 + rng() * 0.9;
    const detailFreq = 3 + rng() * 2.5;
    const seaLevel = biome.seaLevel >= 0 ? biome.seaLevel + (rng() - 0.5) * 0.05 : -1;
    const capLat = 0.72 + rng() * 0.15;

    for (let y = 0; y < H; y++) {
        const lat = (y / H) * Math.PI - Math.PI / 2;
        const cosLat = Math.cos(lat), sinLat = Math.sin(lat);
        for (let x = 0; x < W; x++) {
            const lon = (x / W) * Math.PI * 2;
            const px = cosLat * Math.cos(lon) + ox;
            const py = sinLat + oy;
            const pz = cosLat * Math.sin(lon) + oz;

            const cont = fbm(noise, px, py, pz, { octaves: 4, freq: continentFreq });
            const detail = fbm(noise, px, py, pz, { octaves: 5, freq: detailFreq, gain: 0.45 });
            let e = THREE.MathUtils.clamp((cont * 0.62 + detail * 0.38 + 1) / 2, 0, 1);

            let [r, g, b] = paletteLookup(biome.palette, e);
            let rough = 230, em = [0, 0, 0];

            if (seaLevel >= 0 && e < seaLevel) rough = 80; // water is smooth
            if (biomeName === "ice") rough = 130;

            // polar caps on ocean worlds
            if (biomeName === "ocean" && Math.abs(sinLat) > capLat) {
                const capT = THREE.MathUtils.clamp((Math.abs(sinLat) - capLat) / 0.1, 0, 1);
                r += (238 - r) * capT;
                g += (243 - g) * capT;
                b += (248 - b) * capT;
                rough = 140;
            }

            // glowing lava veins on volcanic worlds
            if (biomeName === "volcanic" && e < biome.lavaLevel) {
                const heat = 1 - e / biome.lavaLevel;
                r = 255 * Math.min(1, 0.6 + heat);
                g = 60 + 120 * heat;
                b = 12;
                em = [r, g * 0.7, 6];
                rough = 200;
            }

            const idx = (y * W + x) * 4;
            colorD.data[idx] = r; colorD.data[idx + 1] = g; colorD.data[idx + 2] = b; colorD.data[idx + 3] = 255;
            const bumpV = e * 255;
            bumpD.data[idx] = bumpV; bumpD.data[idx + 1] = bumpV; bumpD.data[idx + 2] = bumpV; bumpD.data[idx + 3] = 255;
            roughD.data[idx] = rough; roughD.data[idx + 1] = rough; roughD.data[idx + 2] = rough; roughD.data[idx + 3] = 255;
            emisD.data[idx] = em[0]; emisD.data[idx + 1] = em[1]; emisD.data[idx + 2] = em[2]; emisD.data[idx + 3] = 255;
        }
    }

    colorC.getContext("2d").putImageData(colorD, 0, 0);
    bumpC.getContext("2d").putImageData(bumpD, 0, 0);
    roughC.getContext("2d").putImageData(roughD, 0, 0);
    emisC.getContext("2d").putImageData(emisD, 0, 0);
    return { colorC, bumpC, roughC, emisC };
}

function generateCloudMap(rng, W = 512) {
    const H = W / 2;
    const c = makeCanvas(W, H);
    const ctx = c.getContext("2d");
    const data = ctx.createImageData(W, H);
    const noise = createNoise3D(rng);
    const ox = rng() * 50, oy = rng() * 50, oz = rng() * 50;
    const cover = 0.48 + rng() * 0.12;

    for (let y = 0; y < H; y++) {
        const lat = (y / H) * Math.PI - Math.PI / 2;
        const cosLat = Math.cos(lat), sinLat = Math.sin(lat);
        for (let x = 0; x < W; x++) {
            const lon = (x / W) * Math.PI * 2;
            const v = fbm(noise, cosLat * Math.cos(lon) + ox, sinLat + oy, cosLat * Math.sin(lon) + oz,
                { octaves: 5, freq: 2.4, gain: 0.5 });
            const n = (v + 1) / 2;
            const a = THREE.MathUtils.clamp((n - cover) / (1 - cover), 0, 1);
            const idx = (y * W + x) * 4;
            const alpha = Math.pow(a, 1.4) * 255;
            data.data[idx] = alpha; data.data[idx + 1] = alpha; data.data[idx + 2] = alpha; data.data[idx + 3] = 255;
        }
    }
    ctx.putImageData(data, 0, 0);
    return c;
}

function makeRing(rng, planetRadius, tintRGB) {
    const inner = planetRadius * (1.45 + rng() * 0.25);
    const outer = planetRadius * (2.1 + rng() * 0.5);
    const geo = new THREE.RingGeometry(inner, outer, 96, 1);

    // remap UVs radially so a 1D band texture reads as concentric rings
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i);
        uv.setXY(i, (v3.length() - inner) / (outer - inner), 1);
    }

    const c = makeCanvas(256, 1);
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(256, 1);
    const bandRng = rng;
    let band = bandRng();
    for (let x = 0; x < 256; x++) {
        if (x % (6 + Math.floor(band * 20)) === 0) band = bandRng();
        const edge = Math.sin((x / 256) * Math.PI); // fade at both edges
        const a = band * 200 * edge;
        const idx = x * 4;
        img.data[idx] = tintRGB[0]; img.data[idx + 1] = tintRGB[1]; img.data[idx + 2] = tintRGB[2];
        img.data[idx + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    }));
    mesh.rotation.x = Math.PI / 2 + (rng() - 0.5) * 0.3;
    return mesh;
}

function makeAtmosphere(radius, colorArr) {
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(colorArr[0], colorArr[1], colorArr[2]) },
            uIntensity: { value: 0.75 }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        fragmentShader: `
            uniform vec3 uColor;
            uniform float uIntensity;
            varying vec3 vNormal;
            void main() {
                float rim = pow(max(0.0, 0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
                gl_FragColor = vec4(uColor, 1.0) * rim * uIntensity;
            }`,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });
    return new THREE.Mesh(new THREE.SphereGeometry(radius * 1.18, 48, 48), material);
}

export function createProceduralPlanet(seed, { radius = 2.0 } = {}) {
    const finalSeed = sanitizeSeed(seed) || generateSeed();
    const rng = rngFromSeed(finalSeed);

    // biome roll
    const biomeRoll = rng();
    let biomeName;
    if (biomeRoll < 0.3) biomeName = "ocean";
    else if (biomeRoll < 0.55) biomeName = "desert";
    else if (biomeRoll < 0.8) biomeName = "ice";
    else biomeName = "volcanic";
    const biome = BIOMES[biomeName];

    const habitable = rng() < biome.habitabilityChance;
    const hasClouds = rng() < biome.cloudChance;
    const hasRings = rng() < 0.3;
    const tilt = (rng() - 0.5) * 0.9;
    const spinSpeed = 0.03 + rng() * 0.1;

    const { colorC, bumpC, roughC, emisC } = generateSurfaceMaps(rng, biomeName, biome);

    const colorTex = new THREE.CanvasTexture(colorC);
    colorTex.colorSpace = THREE.SRGBColorSpace;
    const bumpTex = new THREE.CanvasTexture(bumpC);
    const roughTex = new THREE.CanvasTexture(roughC);
    const emisTex = new THREE.CanvasTexture(emisC);

    const planetMesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 64, 64),
        new THREE.MeshStandardMaterial({
            map: colorTex,
            bumpMap: bumpTex,
            bumpScale: 0.6,
            roughnessMap: roughTex,
            roughness: 1,
            metalness: 0.02,
            emissiveMap: emisTex,
            emissive: biomeName === "volcanic" ? new THREE.Color(0xff5518) : new THREE.Color(0x000000),
            emissiveIntensity: biomeName === "volcanic" ? 0.9 : 0
        })
    );

    const group = new THREE.Group();
    group.add(planetMesh);

    let cloudMesh = null;
    if (hasClouds) {
        const cloudTex = new THREE.CanvasTexture(generateCloudMap(rng));
        cloudMesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius * 1.02, 48, 48),
            new THREE.MeshStandardMaterial({
                color: biomeName === "volcanic" ? 0x8f8a86 : 0xffffff,
                alphaMap: cloudTex,
                transparent: true,
                opacity: 0.85,
                depthWrite: false,
                roughness: 1
            })
        );
        group.add(cloudMesh);
    }

    const atmoJitter = 0.85 + rng() * 0.3;
    const atmoColor = biome.atmosphere.map((c) => Math.min(1, c * atmoJitter));
    const atmosphere = makeAtmosphere(radius, atmoColor);
    group.add(atmosphere);

    let ringMesh = null;
    if (hasRings) {
        const mid = paletteLookup(biome.palette, 0.6);
        ringMesh = makeRing(rng, radius, mid);
        group.add(ringMesh);
    }

    group.rotation.z = tilt;

    group.userData.tick = (dt) => {
        planetMesh.rotation.y += spinSpeed * dt;
        if (cloudMesh) cloudMesh.rotation.y += spinSpeed * 0.55 * dt;
    };
    group.userData.atmosphereMaterial = atmosphere.material;

    const metadata = {
        seed: finalSeed,
        biome: biomeName,
        habitable,
        clouds: hasClouds,
        rings: hasRings,
        tilt: Number(tilt.toFixed(3)),
        spinSpeed: Number(spinSpeed.toFixed(3))
    };
    group.userData.metadata = metadata;

    return { group, metadata };
}
