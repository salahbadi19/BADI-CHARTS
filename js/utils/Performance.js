/**
 * Performance.js
 * Performance monitoring and FPS counter.
 */
export class Performance {
    constructor() {
        this.frames = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.enabled = false;
        this.renderTime = 0;
        this._renderStart = 0;
    }

    beginRender() {
        this._renderStart = performance.now();
    }

    endRender() {
        this.renderTime = performance.now() - this._renderStart;
    }

    tick() {
        if (!this.enabled) return;
        this.frames++;
        const now = performance.now();
        if (now - this.lastTime >= 1000) {
            this.fps = Math.round((this.frames * 1000) / (now - this.lastTime));
            this.frames = 0;
            this.lastTime = now;
        }
    }
}
