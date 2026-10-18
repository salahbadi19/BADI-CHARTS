/**
 * Canvas.js
 * High-DPI canvas wrapper with proper device pixel ratio handling.
 * Manages sizing, resize observation, and provides drawing context.
 *
 * This is the foundation - every pixel drawn goes through here.
 */
export class Canvas {
    constructor(container, options = {}) {
        this.container = container;
        this.dpr = window.devicePixelRatio || 1;
        this.width = 0;
        this.height = 0;
        this.cssWidth = 0;
        this.cssHeight = 0;

        this.element = document.createElement('canvas');
        this.element.style.display = 'block';
        this.element.style.width = '100%';
        this.element.style.height = '100%';
        this.element.style.position = 'absolute';
        this.element.style.top = '0';
        this.element.style.left = '0';
        this.ctx = this.element.getContext('2d', {
            alpha: options.alpha !== false,
            desynchronized: true,
            willReadFrequently: false
        });

        container.appendChild(this.element);
        this._resizeObserver = new ResizeObserver(() => this._handleResize());
        this._resizeObserver.observe(container);
        this._handleResize();
    }

    _handleResize() {
        const rect = this.container.getBoundingClientRect();
        this.dpr = window.devicePixelRatio || 1;
        this.cssWidth = Math.max(1, Math.floor(rect.width));
        this.cssHeight = Math.max(1, Math.floor(rect.height));
        this.width = Math.floor(this.cssWidth * this.dpr);
        this.height = Math.floor(this.cssHeight * this.dpr);
        this.element.width = this.width;
        this.element.height = this.height;
        this.element.style.width = this.cssWidth + 'px';
        this.element.style.height = this.cssHeight + 'px';
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        if (this.onResize) this.onResize(this.cssWidth, this.cssHeight);
    }

    /**
     * Get the drawing context. Coordinates are in CSS pixels thanks to the transform.
     */
    getContext() {
        return this.ctx;
    }

    /**
     * Clear the entire canvas.
     */
    clear() {
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.restore();
    }

    /**
     * Get CSS pixel dimensions.
     */
    getSize() {
        return { width: this.cssWidth, height: this.cssHeight };
    }

    destroy() {
        this._resizeObserver.disconnect();
        this.element.remove();
    }
}
