/**
 * DrawingManager.js
 * Central manager for all drawing objects on the chart.
 *
 * Features:
 * - Spatial bucketing for fast hit-testing (supports thousands of drawings)
 * - Visible-range culling (only on-screen drawings render)
 * - Selection, hover, and drag-to-move (whole drawing or single anchor)
 * - Settings card popup when a drawing is selected
 * - Serialization (toJSON / fromJSON) for save/load
 *
 * Tool flow:
 * - setActiveTool('trendline') → click on chart starts a new drawing
 * - While drawing: pointer events build anchors
 * - On completion: tool stays active for multi-draw (Esc or right-click to exit)
 */
import { DrawingBase } from './DrawingBase.js';
import { TrendLine } from './TrendLine.js';
import { HorizontalLine } from './HorizontalLine.js';
import { VerticalLine } from './VerticalLine.js';
import { Rectangle } from './Rectangle.js';
import { Ellipse } from './Ellipse.js';
import { Triangle } from './Triangle.js';
import { Fibonacci } from './Fibonacci.js';
import { FibExtension } from './FibExtension.js';
import { FibChannel } from './FibChannel.js';
import { TextDrawing } from './TextDrawing.js';
import { Arrow } from './Arrow.js';
import { RayLine } from './RayLine.js';
import { ParallelChannel } from './ParallelChannel.js';
import { LongPosition } from './LongPosition.js';
import { ShortPosition } from './ShortPosition.js';
import { Brush } from './Brush.js';
import { Polyline } from './Polyline.js';
import { Measurement } from './Measurement.js';
import { PriceLabel } from './PriceLabel.js';
import { DateRange } from './DateRange.js';
import { Pitchfork } from './Pitchfork.js';
import { GannBox } from './GannBox.js';
import { ArrowMarker } from './ArrowMarker.js';
import { drawingToolRegistry } from './DrawingToolRegistry.js';

/**
 * BUILT-IN_TOOLS: a map of all drawing tools that ship with BadiCharts.
 * These are NOT auto-registered — they're available here so the user can
 * register them on demand via DrawingToolRegistry.registerAll(BUILT_IN_TOOLS)
 * or pick specific ones.
 *
 * To register ALL built-in tools:
 *   import { BUILT_IN_TOOLS } from './js/drawing/DrawingManager.js';
 *   import { drawingToolRegistry } from './js/drawing/DrawingToolRegistry.js';
 *   drawingToolRegistry.registerAll(BUILT_IN_TOOLS);
 *
 * To register just one:
 *   drawingToolRegistry.register('trendline', BUILT_IN_TOOLS.trendline);
 *
 * To register a custom tool:
 *   drawingToolRegistry.register('mytool', {
 *     label: 'My Tool', icon: '★', category: 'Custom',
 *     factory: (opts) => new MyTool(opts)
 *   });
 */
export const BUILT_IN_TOOLS = {
    trendline:   { label: 'Trend Line',       icon: '╱', category: 'Trend & Lines',  factory: (opts) => new TrendLine(opts) },
    ray:         { label: 'Ray',              icon: '→', category: 'Trend & Lines',  factory: (opts) => new RayLine(opts) },
    hline:       { label: 'Horizontal Line', icon: '─', category: 'Trend & Lines',  factory: (opts) => new HorizontalLine(opts) },
    vline:       { label: 'Vertical Line',   icon: '│', category: 'Trend & Lines',  factory: (opts) => new VerticalLine(opts) },
    arrow:       { label: 'Arrow',           icon: '➤', category: 'Trend & Lines',  factory: (opts) => new Arrow(opts) },
    brush:       { label: 'Brush',           icon: '๛', category: 'Trend & Lines',  factory: (opts) => new Brush(opts) },
    polyline:    { label: 'Polyline',        icon: '⩘', category: 'Trend & Lines',  factory: (opts) => new Polyline(opts) },
    rectangle:   { label: 'Rectangle',       icon: '▭', category: 'Shapes',         factory: (opts) => new Rectangle(opts) },
    ellipse:     { label: 'Ellipse',         icon: '◯', category: 'Shapes',         factory: (opts) => new Ellipse(opts) },
    triangle:    { label: 'Triangle',        icon: '△', category: 'Shapes',         factory: (opts) => new Triangle(opts) },
    fib:         { label: 'Fib Retracement (editable)', icon: 'F',  category: 'Fibonacci', factory: (opts) => new Fibonacci(opts) },
    fibext:      { label: 'Fib Extension',   icon: 'F+', category: 'Fibonacci',     factory: (opts) => new FibExtension(opts) },
    fibchannel:  { label: 'Fib Channel',     icon: 'F‖', category: 'Fibonacci',     factory: (opts) => new FibChannel(opts) },
    channel:     { label: 'Parallel Channel', icon: '‖', category: 'Patterns & Channels', factory: (opts) => new ParallelChannel(opts) },
    pitchfork:   { label: 'Andrews Pitchfork', icon: '⋔', category: 'Patterns & Channels', factory: (opts) => new Pitchfork(opts) },
    gannbox:     { label: 'Gann Box',        icon: '⊞', category: 'Patterns & Channels', factory: (opts) => new GannBox(opts) },
    longpos:     { label: 'Long Position',    icon: '↗', category: 'Positions',     factory: (opts) => new LongPosition(opts) },
    shortpos:    { label: 'Short Position',  icon: '↘', category: 'Positions',     factory: (opts) => new ShortPosition(opts) },
    text:        { label: 'Text',            icon: 'T',  category: 'Annotations',   factory: (opts) => new TextDrawing(opts) },
    pricelabel:  { label: 'Price Label',     icon: '⌖', category: 'Annotations',   factory: (opts) => new PriceLabel(opts) },
    daterange:   { label: 'Date Range',      icon: '▤', category: 'Annotations',   factory: (opts) => new DateRange(opts) },
    measurement: { label: 'Measurement',    icon: '↔', category: 'Annotations',   factory: (opts) => new Measurement(opts) },
    // Arrow / icon markers — placed above or below candles
    arrowUp:     { label: 'Arrow Up',       icon: '↑', category: 'Markers', factory: (opts) => new ArrowMarker({ ...opts, iconType: 'arrowUp' }) },
    arrowDown:   { label: 'Arrow Down',     icon: '↓', category: 'Markers', factory: (opts) => new ArrowMarker({ ...opts, iconType: 'arrowDown' }) },
    starMarker:  { label: 'Star',           icon: '★', category: 'Markers', factory: (opts) => new ArrowMarker({ ...opts, iconType: 'star' }) },
    flagMarker:  { label: 'Flag',           icon: '⚑', category: 'Markers', factory: (opts) => new ArrowMarker({ ...opts, iconType: 'flag' }) },
    diamondMarker: { label: 'Diamond',      icon: '◆', category: 'Markers', factory: (opts) => new ArrowMarker({ ...opts, iconType: 'diamond' }) },
    dotMarker:   { label: 'Dot Circle',     icon: '●', category: 'Markers', factory: (opts) => new ArrowMarker({ ...opts, iconType: 'dot' }) }
};

export class DrawingManager {
    constructor() {
        this.drawings = [];
        this._drawingById = new Map();
        this.activeTool = null;
        this._currentDrawing = null;
        this.selectedId = null;
        this.hoveredId = null;
        this._bucketSize = 100;
        this._buckets = new Map();
        this._viewport = null;
        this.onSelectionChange = null;
        // Drag state — handle index determined at pointer-down
        this._dragTarget = null;
        this._dragHandleIdx = -1;
        this._dragStartX = 0;
        this._dragStartY = 0;

        // The tool factory lookup is delegated to the global registry.
        // Built-in tools are NOT auto-registered — the user/app must register
        // them explicitly via drawingToolRegistry.registerAll(BUILT_IN_TOOLS)
        // or via drawingToolRegistry.register(id, def) for custom tools.
        this._registry = drawingToolRegistry;
    }

    /**
     * Get the factory for a tool id. Delegates to the registry.
     */
    _getFactory(toolId) {
        return this._registry.factory(toolId);
    }

    setActiveTool(tool) {
        if (tool && !this._registry.has(tool)) {
            console.warn('Unknown drawing tool:', tool);
            return;
        }
        this.activeTool = tool;
        if (!tool && this._currentDrawing) {
            this._currentDrawing = null;
        }
    }

    add(drawing) {
        this.drawings.push(drawing);
        this._drawingById.set(drawing.id, drawing);
        this._indexDrawing(drawing);
        return drawing;
    }

    remove(id) {
        const d = this._drawingById.get(id);
        if (!d) return;
        const idx = this.drawings.indexOf(d);
        if (idx >= 0) this.drawings.splice(idx, 1);
        this._drawingById.delete(id);
        this._unindexDrawing(d);
        if (this.selectedId === id) {
            this.selectedId = null;
            if (this.onSelectionChange) this.onSelectionChange(null);
        }
    }

    clear() {
        this.drawings = [];
        this._drawingById.clear();
        this._buckets.clear();
        this.selectedId = null;
        this.hoveredId = null;
        this._currentDrawing = null;
        if (this.onSelectionChange) this.onSelectionChange(null);
    }

    _indexDrawing(d) {
        // FIX: previously we only indexed the bucket that each anchor falls into.
        // That broke hit-testing for drawings whose anchors span many buckets
        // (e.g. a Trend Line drawn across the whole visible range). Clicking on
        // the middle of such a line returned no candidates and the click was
        // treated as "empty space" instead of selecting the drawing.
        // Fix: index every bucket between the min and max anchor index.
        if (d.anchors.length === 0) return;
        let minKey = Infinity, maxKey = -Infinity;
        for (const a of d.anchors) {
            const key = Math.floor(a.index / this._bucketSize);
            if (key < minKey) minKey = key;
            if (key > maxKey) maxKey = key;
        }
        // Cap to a sane upper bound so a wildly-spanning drawing doesn't blow up
        // the bucket map (e.g. an infinite ray). 200 buckets = 20_000 bars max.
        const SPAN_CAP = 200;
        if (maxKey - minKey > SPAN_CAP) maxKey = minKey + SPAN_CAP;
        for (let k = minKey; k <= maxKey; k++) {
            if (!this._buckets.has(k)) this._buckets.set(k, new Set());
            this._buckets.get(k).add(d.id);
        }
    }
    _unindexDrawing(d) {
        // Same span-based removal — must mirror _indexDrawing exactly.
        if (d.anchors.length === 0) return;
        let minKey = Infinity, maxKey = -Infinity;
        for (const a of d.anchors) {
            const key = Math.floor(a.index / this._bucketSize);
            if (key < minKey) minKey = key;
            if (key > maxKey) maxKey = key;
        }
        const SPAN_CAP = 200;
        if (maxKey - minKey > SPAN_CAP) maxKey = minKey + SPAN_CAP;
        for (let k = minKey; k <= maxKey; k++) {
            const set = this._buckets.get(k);
            if (set) set.delete(d.id);
        }
    }
    _reindexDrawing(d) {
        this._unindexDrawing(d);
        this._indexDrawing(d);
    }

    _candidatesForIndex(index) {
        const key = Math.floor(index / this._bucketSize);
        const ids = new Set();
        for (let k = key - 1; k <= key + 1; k++) {
            const s = this._buckets.get(k);
            if (s) s.forEach(id => ids.add(id));
        }
        return [...ids].map(id => this._drawingById.get(id)).filter(Boolean);
    }

    // ---- Public pointer handlers ----
    onPointerDown(x, y, tool) {
        const factory = this._getFactory(tool);
        if (tool && factory) {
            if (!this._currentDrawing) {
                this._currentDrawing = factory({ color: this._nextColor() });
            }
            this._currentDrawing.onPointerDown(x, y, this._viewport);
        }
    }

    onPointerMove(x, y) {
        if (this._currentDrawing) {
            this._currentDrawing.onPointerMove(x, y, this._viewport);
        }
    }

    onPointerHover(x, y) {
        if (this._currentDrawing) {
            this._currentDrawing.onPointerMove(x, y, this._viewport);
        }
    }

    onPointerUp(x, y) {
        if (this._currentDrawing) {
            this._currentDrawing.onPointerUp(x, y, this._viewport);
            if (this._currentDrawing.isComplete) {
                this.add(this._currentDrawing);
                this._currentDrawing = null;
                // FIX: was staying active allowing unlimited drawings.
                // User wants: draw once, then auto-exit tool mode (back to cursor).
                // To draw again, click the tool button again.
                if (this._onToolComplete) this._onToolComplete();
            }
        }
    }

    cancelDrawing() {
        // Cancel any in-progress drawing. If the active drawing supports
        // cancel() (e.g. Polyline), call it; otherwise just discard.
        if (this._currentDrawing && typeof this._currentDrawing.cancel === 'function') {
            this._currentDrawing.cancel();
        }
        this._currentDrawing = null;
        this.activeTool = null;
    }

    /**
     * Finish the in-progress multi-point drawing (e.g. Polyline).
     * Called on double-click or Enter. For drawings that don't have a
     * finish() method (e.g. TrendLine), this is a no-op.
     */
    finishDrawing() {
        if (this._currentDrawing && typeof this._currentDrawing.finish === 'function') {
            this._currentDrawing.finish();
            if (this._currentDrawing.isComplete) {
                this.add(this._currentDrawing);
                this._currentDrawing = null;
                if (this._onToolComplete) this._onToolComplete();
            }
        }
    }

    /**
     * Hit-test all drawings (top-most first) and return the first match.
     */
    hitTestTopMost(x, y) {
        const idx = this._viewport.xToIndex(x);
        const candidates = this._candidatesForIndex(idx);
        // Sort by zIndex descending so top-most is first
        candidates.sort((a, b) => b.zIndex - a.zIndex);
        for (const d of candidates) {
            if (!d.visible) continue;
            if (d.hitTest(x, y, this._viewport)) return d;
            // Also check handles
            if (d.hitTestHandle && d.hitTestHandle(x, y, this._viewport) >= 0) return d;
        }
        return null;
    }

    /**
     * Update hover state (called on every pointer-move with no button down).
     */
    updateHover(x, y) {
        const d = this.hitTestTopMost(x, y);
        const newId = d ? d.id : null;
        if (newId !== this.hoveredId) {
            if (this.hoveredId) {
                const old = this._drawingById.get(this.hoveredId);
                if (old) old.isHovered = false;
            }
            if (d) d.isHovered = true;
            this.hoveredId = newId;
        }
    }

    /**
     * Handle a click (no drag) — select/deselect.
     */
    handleClick(x, y) {
        const d = this.hitTestTopMost(x, y);
        // Deselect previous
        if (this.selectedId) {
            const prev = this._drawingById.get(this.selectedId);
            if (prev) prev.isSelected = false;
        }
        if (d) {
            d.isSelected = true;
            this.selectedId = d.id;
        } else {
            this.selectedId = null;
        }
        if (this.onSelectionChange) this.onSelectionChange(this.selectedId ? d : null);
    }

    /**
     * Called by EventManager when a pointer-down lands on a drawing.
     * Determines whether we grabbed a handle (single anchor) or the body (whole drawing).
     * The result is stored so dragDrawing doesn't need to re-check on every move.
     */
    startDrag(drawing, x, y) {
        this._dragTarget = drawing;
        // Check if we grabbed a specific handle — determined ONCE at pointer-down
        const handleIdx = drawing.hitTestHandle(x, y, this._viewport);
        this._dragHandleIdx = handleIdx;
        this._dragStartX = x;
        this._dragStartY = y;
    }

    /**
     * Drag the selected drawing. Uses the handle index determined at pointer-down
     * so only the grabbed anchor moves — the other anchors stay fixed.
     */
    dragDrawing(drawing, x, y, dx, dy) {
        if (drawing.locked) return;
        // FIX: use the handle index determined at pointer-down (startDrag).
        // Previously this re-checked hitTestHandle on every move using the current
        // cursor position, which caused the wrong anchor to be moved after the
        // first move (the handle had shifted, so hitTestHandle returned -1 or a
        // different handle). This made both points move together when dragging.
        if (this._dragHandleIdx >= 0) {
            // Move only the grabbed anchor — all other anchors stay fixed
            drawing.setAnchor(this._dragHandleIdx, x, y, this._viewport);
        } else {
            // Move whole drawing (translate all anchors)
            drawing.translateBy(dx, dy, this._viewport);
        }
        this._reindexDrawing(drawing);
    }

    endDrag() {
        this._dragTarget = null;
        this._dragHandleIdx = -1;
    }

    _nextColor() {
        const palette = ['#12C4F0', '#EA3943', '#16C784', '#ff9800', '#9c27b0', '#00bcd4', '#ffeb3b', '#e91e63'];
        return palette[this.drawings.length % palette.length];
    }

    deleteSelected() {
        if (this.selectedId) this.remove(this.selectedId);
    }

    getSelected() {
        return this.selectedId ? this._drawingById.get(this.selectedId) : null;
    }

    draw(ctx, viewport, theme) {
        const left = viewport.leftEdge - 100;
        const right = viewport.rightEdge + 100;
        const visible = [];
        for (const d of this.drawings) {
            if (!d.visible) continue;
            let inView = false;
            for (const a of d.anchors) {
                if (a.index >= left && a.index <= right) { inView = true; break; }
            }
            if (d.type === 'hline' || d.type === 'vline' || d.type === 'pricelabel') inView = true;
            if (inView) visible.push(d);
        }
        visible.sort((a, b) => a.zIndex - b.zIndex);
        for (const d of visible) d.draw(ctx, viewport, theme);
        if (this._currentDrawing) this._currentDrawing.draw(ctx, viewport, theme);
    }

    get count() { return this.drawings.length; }

    toJSON() {
        return this.drawings.map(d => d.toJSON());
    }

    fromJSON(data) {
        this.clear();
        for (const item of data) {
            const factory = this._toolFactories[item.type];
            if (factory) {
                const d = factory(item);
                this.add(d);
            }
        }
    }
}
