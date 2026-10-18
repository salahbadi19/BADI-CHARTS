/**
 * SeriesBase.js
 * Base class for all series (candles, volume, indicators).
 * Provides common lifecycle hooks and visibility controls.
 */
export class SeriesBase {
    constructor(options = {}) {
        this.visible = options.visible !== false;
        this.zIndex = options.zIndex || 0;
        this.pane = options.pane || 'price'; // 'price' | 'volume' | 'separate'
    }

    setVisible(v) { this.visible = v; }
    setZIndex(z) { this.zIndex = z; }

    /**
     * Subclasses override this. ctx is the canvas context.
     */
    draw(ctx, viewport, dm, theme) {}
}
