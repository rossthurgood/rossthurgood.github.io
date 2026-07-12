import { vi } from "vitest";

let loadError;

export const loads = [];

export function setLoadError(error) {
    loadError = error;
}

export class GLTFLoader {
    load = vi.fn((source, onLoad, onProgress, onError) => {
        loads.push({ source, onProgress });
        if (loadError) {
            onError(loadError);
            return;
        }

        onLoad({ scene: { name: "loaded-spaceship" } });
    });
}
