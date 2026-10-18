/**
 * Viewport.js
 * Tracks the visible portion of the chart in both time (bar index) and price space.
 * Handles pan and zoom logic independently of rendering.
 *
 * Key concepts:
 * - barSpacing: pixel width allocated per bar (candle)
 * - rightOffset: number of bars of empty space kept on the right edge
 * - logicalRange: [from, to] in fractional bar indices visible on screen
 */
import { MathUtils } from '../utils/MathUtils.js';

export class Viewport {
    constructor() {
        this.barSpacing = 8;          // pixels per bar
        this.minBarSpacing = 1;
        this.maxBarSpacing = 80;
        this.rightOffset = 10;        // empty bars on right
        this.maxRightOffset = 200;
        this.scrollPosition = 0;      // logical index at left edge
        this.priceRange = { min: 0, max: 1 };  // current visible price range
        this.autoScale = true;        // auto-fit price range to visible bars
        this.userPriceRange = null;   // user-set price range (when autoScale is off)
        this.width = 0;
        this.height = 0;
        this.priceHeight = 0;         // height of the price pane (excludes volume)
        this.volumeHeight = 0;
    }

    setSize(width, height, volumeRatio = 0.2) {
        this.width = width;
        this.height = height;
        this.volumeHeight = Math.floor(height * volumeRatio);
        this.priceHeight = height - this.volumeHeight;
    }

    /**
     * Number of bars that fit in the current width.
     */
    get barsVisible() {
        return this.width / this.barSpacing;
    }

    /**
     * Convert a bar index (fractional) to an x pixel coordinate.
     */
    indexToX(index) {
        return (index - this.scrollPosition) * this.barSpacing;
    }

    /**
     * Convert an x pixel coordinate to a fractional bar index.
     */
    xToIndex(x) {
        return this.scrollPosition + x / this.barSpacing;
    }

    /**
     * Convert a price to a y coordinate within the price pane.
     */
    priceToY(price, pane = 'price') {
        const range = this.priceRange;
        const height = pane === 'volume' ? this.volumeHeight : this.priceHeight;
        const offset = pane === 'volume' ? this.priceHeight : 0;
        if (range.min === range.max) return offset + height / 2;
        const t = (price - range.min) / (range.max - range.min);
        // Inverted because y grows downward
        return offset + (1 - t) * height;
    }

    /**
     * Convert a y coordinate to a price.
     */
    yToPrice(y, pane = 'price') {
        const range = this.priceRange;
        const height = pane === 'volume' ? this.volumeHeight : this.priceHeight;
        const offset = pane === 'volume' ? this.priceHeight : 0;
        const t = 1 - (y - offset) / height;
        return range.min + t * (range.max - range.min);
    }

    /**
     * The rightmost visible bar index (fractional).
     */
    get rightEdge() {
        return this.scrollPosition + this.barsVisible;
    }

    /**
     * The leftmost visible bar index (fractional).
     */
    get leftEdge() {
        return this.scrollPosition;
    }

    /**
     * Pan the chart horizontally by a number of pixels.
     */
    panBy(deltaPx) {
        const deltaBars = deltaPx / this.barSpacing;
        this.scrollPosition -= deltaBars;
    }

    /**
     * Zoom around a focal x point. factor > 1 zooms in (bars get wider).
     */
    zoomAt(focalX, factor) {
        const newSpacing = MathUtils.clamp(this.barSpacing * factor, this.minBarSpacing, this.maxBarSpacing);
        const actualFactor = newSpacing / this.barSpacing;
        // Keep focal point stable: index under focalX shouldn't move
        const focalIndex = this.xToIndex(focalX);
        this.barSpacing = newSpacing;
        this.scrollPosition = focalIndex - focalX / newSpacing;
    }

    /**
     * Set the visible range to fit a specific bar range with optional right padding.
     */
    fitRange(barCount, rightOffset = 10) {
        const available = this.width;
        this.barSpacing = MathUtils.clamp(available / Math.max(1, barCount), this.minBarSpacing, this.maxBarSpacing);
        this.rightOffset = rightOffset;
        this.scrollPosition = -rightOffset;
    }

    /**
     * Scroll to the most recent data (right edge).
     */
    scrollToRight(barCount) {
        this.scrollPosition = barCount - this.barsVisible + this.rightOffset;
    }

    /**
     * Update the price range based on visible data.
     */
    updatePriceRange(dataManager) {
        if (!this.autoScale || !dataManager) return;
        const left = Math.max(0, Math.floor(this.leftEdge));
        const right = Math.min(dataManager.size - 1, Math.ceil(this.rightEdge));
        if (right < left) return;
        let min = Infinity, max = -Infinity;
        for (let i = left; i <= right; i++) {
            const c = dataManager.get(i);
            if (!c) continue;
            if (c.low < min) min = c.low;
            if (c.high > max) max = c.high;
        }
        if (!isFinite(min) || !isFinite(max) || min === max) return;
        // Add 5% padding top and bottom
        const pad = (max - min) * 0.05;
        this.priceRange = { min: min - pad, max: max + pad };
    }
}
