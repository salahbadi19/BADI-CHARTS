/**
 * PaneManager.js
 * Manages a stack of panes rendered on ONE shared canvas.
 *
 * Architecture (v0.4):
 * - ONE canvas fills the entire paneContainer. All drawing happens on it.
 * - Pane DOM wrappers exist only for layout (heights) and resize handles.
 * - Non-main panes have NO canvas — they're transparent divs that define regions.
 * - Resize handles are on top of the canvas (z-index: 2) and capture pointer events.
 * - The canvas captures pointer events for pan/draw/crosshair.
 *
 * This makes the chart look like ONE connected surface:
 * - Crosshair vertical line extends across all regions.
 * - Current-price line extends across all regions.
 * - Divider lines between regions are drawn on the same canvas (connected, not broken).
 */
import { Canvas } from '../core/Canvas.js';
import { DomUtils } from '../utils/DomUtils.js';

export class PaneManager {
    constructor(container, engine) {
        this.container = container;
        this.engine = engine;
        this.panes = [];
        this.timeAxisHeight = 28;
        this.handleHeight = 4;
        this._resizeObserver = new ResizeObserver(() => this._layout());
        this._resizeObserver.observe(container);
    }

    /**
     * Initialize: create the single shared canvas + main pane + time axis strip.
     */
    init(initialHeight) {
        this.panes = [];
        // Create the ONE shared canvas that fills the entire paneContainer.
        this.canvasContainer = DomUtils.el('div', { class: 'ac-shared-canvas-container' });
        this.container.appendChild(this.canvasContainer);
        this.canvas = new Canvas(this.canvasContainer, { alpha: true });

        // Create the main pane wrapper (for layout — no canvas inside)
        const main = this._createPaneWrapper('main', 'Price', initialHeight, true);
        this.panes.push(main);

        // Create the time axis pane wrapper (at the bottom, fixed height)
        this.timeAxisPane = this._createTimeAxisWrapper(this.timeAxisHeight);

        this._layout();
        return main;
    }

    _createPaneWrapper(id, title, height, isMain = false) {
        const wrapper = DomUtils.el('div', { class: 'ac-pane' + (isMain ? ' ac-pane-main' : ''), dataset: { paneId: id } });
        this.container.appendChild(wrapper);
        return {
            id, title, height, isMain,
            wrapper,
            indicators: [],
            priceRange: { min: 0, max: 1 },
            autoScale: true,
            visible: true
        };
    }

    _createTimeAxisWrapper(height) {
        const wrapper = DomUtils.el('div', { class: 'ac-pane ac-pane-timeaxis', dataset: { paneId: 'timeaxis' } });
        this.container.appendChild(wrapper);
        return {
            id: 'timeaxis', title: 'Time', height, isMain: false, isTimeAxis: true,
            wrapper, indicators: [], visible: true
        };
    }

    /**
     * Add a new indicator pane below the existing ones (above the time axis).
     */
    addPane(id, title, height = 120) {
        const existing = this.panes.find(p => p.id === id);
        if (existing) return existing;
        const pane = this._createPaneWrapper(id, title, height, false);
        this.panes.push(pane);
        // Move wrapper BEFORE the time axis so time axis stays at the bottom
        if (this.timeAxisPane && this.timeAxisPane.wrapper.parentNode === this.container) {
            this.container.insertBefore(pane.wrapper, this.timeAxisPane.wrapper);
        }
        // Insert resize handle before this pane
        this._insertResizeHandle(pane);
        this._layout();
        return pane;
    }

    _insertResizeHandle(pane) {
        const handle = DomUtils.el('div', { class: 'ac-pane-resize-handle' });
        pane.wrapper.parentNode.insertBefore(handle, pane.wrapper);
        let startY = 0, startH = 0, prevPane = null, startPrevH = 0;
        const onMove = (e) => {
            const dy = e.clientY - startY;
            const newH = Math.max(60, startH - dy);
            const newPrevH = Math.max(80, startPrevH + dy);
            pane.height = newH;
            if (prevPane) prevPane.height = newPrevH;
            this._layout();
            if (this.engine) this.engine.requestRender();
        };
        const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        handle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startY = e.clientY;
            startH = pane.height;
            const idx = this.panes.indexOf(pane);
            prevPane = idx > 0 ? this.panes[idx - 1] : null;
            startPrevH = prevPane ? prevPane.height : 0;
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.body.style.cursor = 'ns-resize';
            document.body.style.userSelect = 'none';
        });
    }

    removePane(id) {
        const idx = this.panes.findIndex(p => p.id === id);
        if (idx <= 0) return;
        const pane = this.panes[idx];
        const handle = pane.wrapper.previousElementSibling;
        if (handle && handle.classList.contains('ac-pane-resize-handle')) handle.remove();
        pane.wrapper.remove();
        this.panes.splice(idx, 1);
        this._layout();
    }

    getPane(id) {
        return this.panes.find(p => p.id === id);
    }

    get main() { return this.panes[0]; }

    /**
     * Layout: apply heights to DOM wrappers. The shared canvas fills the container.
     */
    _layout() {
        const totalH = this.container.clientHeight;
        const handleCount = this.panes.length - 1 + 1; // handles between panes + handle before time axis
        const handleH = this.handleHeight;
        const timeAxisH = this.timeAxisHeight;
        let usedH = handleCount * handleH + timeAxisH;
        for (const p of this.panes) usedH += p.height;
        if (usedH > totalH) {
            const available = totalH - handleCount * handleH - timeAxisH;
            let paneH = 0;
            for (const p of this.panes) paneH += p.height;
            const scale = available / paneH;
            for (const p of this.panes) p.height *= scale;
        }
        for (const p of this.panes) {
            p.wrapper.style.flexBasis = p.height + 'px';
            p.wrapper.style.flexGrow = p.isMain ? '1' : '0';
        }
        if (this.timeAxisPane) {
            this.timeAxisPane.wrapper.style.flexBasis = timeAxisH + 'px';
            this.timeAxisPane.wrapper.style.flexGrow = '0';
        }
    }

    /**
     * Compute region rectangles for all panes based on current DOM layout.
     * Returns array of { id, pane, rect: {x, y, w, h} } in canvas CSS pixels.
     * The regions are ordered top-to-bottom: main, [indicator panes...], timeaxis.
     */
    getRegions() {
        const containerRect = this.container.getBoundingClientRect();
        const regions = [];
        const w = containerRect.width;
        let y = 0;
        for (let i = 0; i < this.panes.length; i++) {
            const pane = this.panes[i];
            const rect = pane.wrapper.getBoundingClientRect();
            const h = rect.height;
            regions.push({ id: pane.id, pane, rect: { x: 0, y, w, h } });
            y += h;
            // Add resize handle gap (except after last pane — the time axis follows)
            if (i < this.panes.length - 1) y += this.handleHeight;
            else y += this.handleHeight; // handle before time axis
        }
        // Time axis region
        if (this.timeAxisPane) {
            const rect = this.timeAxisPane.wrapper.getBoundingClientRect();
            regions.push({ id: 'timeaxis', pane: this.timeAxisPane, rect: { x: 0, y, w, h: rect.height } });
        }
        return regions;
    }

    /**
     * Get the region at a given Y coordinate.
     */
    regionAtY(y) {
        const regions = this.getRegions();
        for (const r of regions) {
            if (y >= r.rect.y && y < r.rect.y + r.rect.h) return r;
        }
        return null;
    }

    destroy() {
        this._resizeObserver.disconnect();
        if (this.canvas) this.canvas.destroy();
    }
}
