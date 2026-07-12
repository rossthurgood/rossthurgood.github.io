import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const mockPath = (file) => fileURLToPath(new URL(`./tests/mocks/${file}`, import.meta.url));

export default defineConfig({
    plugins: [
        {
            name: "mock-browser-cdn-imports",
            enforce: "pre",
            resolveId(source) {
                if (source.includes("/build/three.module.js")) {
                    return mockPath("three.js");
                }
                if (source.includes("/loaders/GLTFLoader.js")) {
                    return mockPath("GLTFLoader.js");
                }
                if (source === "https://jsdelivr.net") {
                    return mockPath("gsap.js");
                }
            },
            transform(code, id) {
                if (!id.endsWith("/projects/one-last-signal/index.js")) {
                    return;
                }

                return code
                    .replace(
                        "https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js",
                        mockPath("three.js")
                    )
                    .replace(
                        "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/loaders/GLTFLoader.js",
                        mockPath("GLTFLoader.js")
                    )
                    .replaceAll("https://jsdelivr.net", mockPath("gsap.js"));
            }
        }
    ],
    resolve: {
        alias: [
            {
                find: "jsm/controls/OrbitControls.js",
                replacement: mockPath("OrbitControls.js")
            },
            {
                find: /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@.*\/examples\/jsm\/loaders\/GLTFLoader\.js$/,
                replacement: mockPath("GLTFLoader.js")
            },
            {
                find: /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@.*\/build\/three\.module\.js$/,
                replacement: mockPath("three.js")
            },
            {
                find: "https://jsdelivr.net",
                replacement: mockPath("gsap.js")
            },
            {
                find: "three",
                replacement: mockPath("three.js")
            }
        ]
    },
    test: {
        coverage: {
            include: [
                "projects/icosahedron/index.js",
                "projects/icosahedron2/index.js",
                "projects/one-last-signal/index.js"
            ],
            reporter: ["text", "json-summary"],
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80
            }
        },
        restoreMocks: true
    }
});
