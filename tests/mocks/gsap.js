import { vi } from "vitest";

export const ScrollTrigger = {};
export const timelines = [];

class Timeline {
    constructor(options) {
        this.options = options;
        this.add = vi.fn(() => this);
        this.addLabel = vi.fn(() => this);
        this.fromTo = vi.fn(() => this);
        this.set = vi.fn((target, values) => {
            Object.assign(target, values);
            return this;
        });
        this.to = vi.fn((target, values) => {
            if (values.onUpdate) {
                values.onUpdate();
            }
            return this;
        });
        timelines.push(this);
    }
}

const gsap = {
    registerPlugin: vi.fn(),
    set: vi.fn((target, values) => Object.assign(target, values)),
    timeline: vi.fn((options) => new Timeline(options))
};

export default gsap;
