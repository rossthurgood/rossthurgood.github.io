import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installBrowserEnvironment } from "./test-environment.js";

describe.each([
    ["green and pink", "../projects/icosahedron/index.js", 0x00ff00, 0xff69b4],
    ["orange and purple", "../projects/icosahedron2/index.js", 0xffa500, 0x63099c]
])("%s icosahedron", (_, modulePath, skyColor, groundColor) => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("builds and animates the scene", async () => {
        const environment = installBrowserEnvironment();
        vi.spyOn(Math, "random").mockReturnValue(0.75);

        await import(modulePath);
        const { instances } = await import("./mocks/three.js");
        const { instances: controls } = await import("./mocks/OrbitControls.js");

        expect(instances.renderers).toHaveLength(1);
        expect(instances.renderers[0].setSize).toHaveBeenCalledWith(1280, 720);
        expect(environment.body.appendChild).toHaveBeenCalledWith(
            instances.renderers[0].domElement
        );
        expect(instances.lights[0]).toMatchObject({
            groundColor,
            intensity: 1,
            skyColor
        });
        expect(controls[0]).toMatchObject({
            autoRotate: true,
            autoRotateSpeed: 1,
            dampingFactor: 0.05,
            enableDamping: true,
            enableZoom: true
        });

        const solidMesh = instances.meshes[0];
        const firstFrame = environment.requestAnimationFrame.mock.calls[0][0];
        firstFrame();

        expect(solidMesh.rotation).toMatchObject({ x: 0.02, y: 0.02 });
        expect(instances.renderers[0].render).toHaveBeenCalledTimes(2);
        expect(controls[0].update).toHaveBeenCalledTimes(2);
    });

    it("chooses new target speeds every 120 frames", async () => {
        const environment = installBrowserEnvironment();
        const random = vi.spyOn(Math, "random")
            .mockReturnValueOnce(0.25)
            .mockReturnValueOnce(0.25)
            .mockReturnValue(0.75);

        await import(modulePath);

        for (let frame = 1; frame < 120; frame += 1) {
            const callback = environment.requestAnimationFrame.mock.calls[frame - 1][0];
            callback();
        }

        expect(random).toHaveBeenCalledTimes(4);
    });
});
