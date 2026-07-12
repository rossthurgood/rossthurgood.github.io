import { vi } from "vitest";

export const instances = {
    cameras: [],
    clocks: [],
    geometries: [],
    instancedMeshes: [],
    lights: [],
    materials: [],
    meshes: [],
    renderers: [],
    scenes: [],
    textureLoaders: []
};

class Transform {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }

    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    setScalar(value) {
        return this.set(value, value, value);
    }
}

export class Object3D {
    constructor() {
        this.children = [];
        this.matrix = {};
        this.position = new Transform();
        this.rotation = new Transform();
        this.scale = new Transform().setScalar(1);
    }

    add(child) {
        this.children.push(child);
    }

    updateMatrix() {
        this.matrix = {
            position: { ...this.position },
            rotation: { ...this.rotation },
            scale: { ...this.scale }
        };
    }
}

export class Scene extends Object3D {
    constructor() {
        super();
        this.background = undefined;
        instances.scenes.push(this);
    }
}

export class PerspectiveCamera extends Object3D {
    constructor(fieldOfView, aspect, near, far) {
        super();
        Object.assign(this, { fieldOfView, aspect, near, far });
        this.updateProjectionMatrix = vi.fn();
        this.lookAt = vi.fn();
        instances.cameras.push(this);
    }
}

export class WebGLRenderer {
    constructor(options) {
        this.options = options;
        this.domElement = { style: {} };
        this.render = vi.fn();
        this.setClearColor = vi.fn();
        this.setPixelRatio = vi.fn();
        this.setSize = vi.fn();
        instances.renderers.push(this);
    }
}

class PositionAttribute {
    constructor(count = 3) {
        this.count = count;
        this.values = Array.from({ length: count }, () => [0, 0, 0]);
    }

    getX(index) {
        return this.values[index][0];
    }

    getY(index) {
        return this.values[index][1];
    }

    getZ(index) {
        return this.values[index][2];
    }

    setXYZ(index, x, y, z) {
        this.values[index] = [x, y, z];
    }
}

export class BufferGeometry {
    constructor() {
        this.attributes = {};
        this.computeVertexNormals = vi.fn();
        this.setAttribute = vi.fn((name, value) => {
            this.attributes[name] = value;
        });
        instances.geometries.push(this);
    }
}

export class IcosahedronGeometry extends BufferGeometry {
    constructor(size, detail) {
        super();
        this.size = size;
        this.detail = detail;
        this.attributes.position = new PositionAttribute();
    }
}

export class SphereGeometry extends BufferGeometry {
    constructor(radius, widthSegments, heightSegments) {
        super();
        Object.assign(this, { radius, widthSegments, heightSegments });
    }
}

export class BufferAttribute {
    constructor(array, itemSize) {
        Object.assign(this, { array, itemSize });
    }
}

class Material {
    constructor(options) {
        Object.assign(this, options);
        instances.materials.push(this);
    }
}

export class MeshStandardMaterial extends Material {}
export class MeshBasicMaterial extends Material {}
export class PointsMaterial extends Material {}

export class Mesh extends Object3D {
    constructor(geometry, material) {
        super();
        Object.assign(this, { geometry, material });
        instances.meshes.push(this);
    }
}

export class Points extends Mesh {}
export class Group extends Object3D {}

export class InstancedMesh extends Mesh {
    constructor(geometry, material, count) {
        super(geometry, material);
        this.count = count;
        this.instanceMatrix = { needsUpdate: false };
        this.setMatrixAt = vi.fn();
        instances.instancedMeshes.push(this);
    }
}

class Light extends Object3D {
    constructor(color, intensity) {
        super();
        Object.assign(this, { color, intensity });
        instances.lights.push(this);
    }
}

export class HemisphereLight extends Light {
    constructor(skyColor, groundColor, intensity) {
        super(skyColor, intensity);
        Object.assign(this, { skyColor, groundColor });
    }
}

export class AmbientLight extends Light {}
export class DirectionalLight extends Light {}

export class TextureLoader {
    constructor() {
        this.load = vi.fn((source) => ({ source }));
        instances.textureLoaders.push(this);
    }
}

export class Clock {
    constructor() {
        this.getElapsedTime = vi.fn(() => 1);
        instances.clocks.push(this);
    }
}

export const MathUtils = {
    lerp: (start, end, alpha) => start + (end - start) * alpha
};

export const ACESFilmicToneMapping = "ACESFilmicToneMapping";
export const SRGBColorSpace = "SRGBColorSpace";
