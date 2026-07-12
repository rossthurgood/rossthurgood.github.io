import { vi } from "vitest";

export function installBrowserEnvironment({ includeSceneContainer = true } = {}) {
    const listeners = {};
    const body = {
        appendChild: vi.fn()
    };
    const sceneContainer = {
        appendChild: vi.fn()
    };
    const introText = {
        style: {},
        textContent: ""
    };
    const document = {
        body,
        querySelector: vi.fn((selector) => {
            if (selector === "#scene-container") {
                return includeSceneContainer ? sceneContainer : null;
            }
            if (selector === "#intro-text") {
                return introText;
            }
            return null;
        })
    };
    const window = {
        addEventListener: vi.fn((event, listener) => {
            listeners[event] = listener;
        }),
        devicePixelRatio: 3,
        innerHeight: 720,
        innerWidth: 1280
    };
    const requestAnimationFrame = vi.fn();

    vi.stubGlobal("document", document);
    vi.stubGlobal("window", window);
    vi.stubGlobal("requestAnimationFrame", requestAnimationFrame);

    return {
        body,
        document,
        introText,
        listeners,
        requestAnimationFrame,
        sceneContainer,
        window
    };
}
