/**
 * AnimationLoop.js
 * Centralized requestAnimationFrame loop with dirty-flag scheduling.
 * The chart only re-renders when something changes (move, pan, zoom, data update).
 *
 * This is critical for performance with thousands of drawings:
 * - No continuous rendering when idle → zero CPU/GPU usage
 * - Coalesces multiple invalidate() calls into a single frame
 */
export class AnimationLoop {
    constructor(renderFn) {
        this.renderFn = renderFn;
        this.dirty = false;
        this.running = false;
        this._rafId = 0;
        this._loop = this._loop.bind(this);
    }

    /**
     * Mark the chart as needing a re-render. Multiple calls within one frame
     * are coalesced into a single render.
     */
    requestRender() {
        if (this.dirty) return;
        this.dirty = true;
        if (!this.running) {
            this.running = true;
            this._rafId = requestAnimationFrame(this._loop);
        }
    }

    _loop() {
        this.running = false;
        if (this.dirty) {
            this.dirty = false;
            this.renderFn();
        }
    }

    stop() {
        if (this._rafId) cancelAnimationFrame(this._rafId);
        this.running = false;
        this.dirty = false;
    }
}
