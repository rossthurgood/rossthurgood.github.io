import { vi } from "vitest";

export const instances = [];

export class OrbitControls {
    constructor(camera, element) {
        this.camera = camera;
        this.element = element;
        this.update = vi.fn();
        instances.push(this);
    }
}
