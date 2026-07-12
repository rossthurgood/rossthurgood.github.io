import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installBrowserEnvironment } from "./test-environment.js";

describe("one-last-signal scene", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("builds the journey, responds to resize, and animates", async () => {
        const environment = installBrowserEnvironment();
        vi.spyOn(Math, "random").mockReturnValue(0.5);

        await import("../projects/one-last-signal/index.js");
        const { instances } = await import("./mocks/three.js");
        const { loads } = await import("./mocks/GLTFLoader.js");
        const { timelines } = await import("./mocks/gsap.js");

        expect(environment.introText).toMatchObject({
            textContent: "Scroll down to traverse new space"
        });
        expect(environment.introText.style.zIndex).toBe("2");
        expect(environment.sceneContainer.appendChild).toHaveBeenCalledWith(
            instances.renderers[0].domElement
        );
        expect(instances.renderers[0].setPixelRatio).toHaveBeenCalledWith(2);
        expect(loads).toEqual([{ source: "spaceship.glb", onProgress: undefined }]);
        expect(instances.instancedMeshes[0].setMatrixAt).toHaveBeenCalledTimes(250);
        expect(instances.instancedMeshes[0].instanceMatrix.needsUpdate).toBe(true);
        expect(timelines).toHaveLength(3);

        environment.window.innerWidth = 900;
        environment.window.innerHeight = 600;
        environment.listeners.resize();

        expect(instances.cameras[0].aspect).toBe(1.5);
        expect(instances.cameras[0].updateProjectionMatrix).toHaveBeenCalledOnce();
        expect(instances.renderers[0].setSize).toHaveBeenLastCalledWith(900, 600);

        const asteroid = { rotation: { y: 0, z: 0 } };
        instances.instancedMeshes[0].children.push(asteroid);
        const firstFrame = environment.requestAnimationFrame.mock.calls[0][0];
        firstFrame();

        expect(instances.renderers[0].render).toHaveBeenCalledTimes(2);
        expect(asteroid.rotation).toEqual({ y: 0.001, z: 0.002 });
    });

    it("reports spaceship loading errors", async () => {
        installBrowserEnvironment();
        const error = new Error("model unavailable");
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const loader = await import("./mocks/GLTFLoader.js");
        loader.setLoadError(error);

        await import("../projects/one-last-signal/index.js");

        expect(consoleError).toHaveBeenCalledWith(
            "An error occurred loading the spaceship model:",
            error
        );
    });

    it("fails clearly when the scene container is missing", async () => {
        installBrowserEnvironment({ includeSceneContainer: false });

        await expect(
            import("../projects/one-last-signal/index.js")
        ).rejects.toThrow("Missing #scene-container element");
    });
});
