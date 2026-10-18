/**
 * DrawingBase.js
 * Base class for all drawing objects.
 *
 * Anchors are stored as { index, price } pairs (logical chart coordinates),
 * so drawings stay attached to the chart as you pan/zoom.
 *
 * Subclasses override:
 *   - draw(ctx, viewport, theme)
 *   - hitTest(x, y, viewport) → bool
 *   - getAnchorHandle(index) → { x, y } screen pos for the handle (for drag)
 *
 * Selection / dragging is handled here in the base class.
 */
export class DrawingBase {
    constructor(options = {}) {
        this.id = options.id || (DrawingBase._idCounter++);
        this.type = 'base';
        this.name = options.name || 'Drawing';
        this.anchors = [];
        this.isComplete = false;
        this.isSelected = false;
        this.isHovered = false;
        this.color = options.color || '#12C4F0';
        this.fillColor = options.fillColor || null;
        this.lineWidth = options.lineWidth || 1.5;
        this.lineStyle = options.lineStyle || 'solid';
        this.opacity = options.opacity != null ? options.opacity : 1;
        this.visible = true;
        this.locked = false;
        this.zIndex = 100;
        this.text = options.text || '';
        this.showText = options.showText || false;
        this.fontSize = options.fontSize || 11;
        this.extend = options.extend || false;
        this.showLabels = options.showLabels !== false;
        this._hitTolerance = 7;
        this._handleSize = 7;
        this._dragAnchorIndex = -1;
    }

    _anchorToScreen(anchor, viewport) {
        return {
            x: viewport.indexToX(anchor.index) + viewport.barSpacing / 2,
            y: viewport.priceToY(anchor.price)
        };
    }

    _screenToAnchor(x, y, viewport) {
        return {
            index: viewport.xToIndex(x - viewport.barSpacing / 2),
            price: viewport.yToPrice(y)
        };
    }

    _applyLineStyle(ctx) {
        if (this.lineStyle === 'dashed') ctx.setLineDash([7, 4]);
        else if (this.lineStyle === 'dotted') ctx.setLineDash([2, 3]);
        else if (this.lineStyle === 'long-dash') ctx.setLineDash([12, 5]);
        else ctx.setLineDash([]);
    }

    _withAlpha(color, alpha) {
        if (!color) return 'transparent';
        if (color.startsWith('#')) {
            let hex = color.slice(1);
            if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r},${g},${b},${alpha})`;
        }
        if (color.startsWith('rgb(')) {
            return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
        }
        return color;
    }

    _drawHandle(ctx, x, y, theme, highlighted = false) {
        const s = this._handleSize;
        ctx.fillStyle = highlighted ? theme.handleBorder : theme.handleFill;
        ctx.strokeStyle = theme.handleBorder;
        ctx.lineWidth = 1.5;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
        ctx.strokeRect(x - s / 2, y - s / 2, s, s);
    }

    /**
     * Returns the index of the anchor whose handle is at (x,y), or -1.
     */
    hitTestHandle(x, y, viewport) {
        for (let i = 0; i < this.anchors.length; i++) {
            const p = this._anchorToScreen(this.anchors[i], viewport);
            if (Math.abs(x - p.x) <= this._hitTolerance && Math.abs(y - p.y) <= this._hitTolerance) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Move an anchor to a new screen position.
     */
    setAnchor(index, x, y, viewport) {
        if (index < 0 || index >= this.anchors.length) return;
        this.anchors[index] = this._screenToAnchor(x, y, viewport);
    }

    /**
     * Move all anchors by a screen delta (used when dragging the whole drawing).
     */
    translateBy(dx, dy, viewport) {
        const dIndex = dx / viewport.barSpacing;
        const span = viewport.priceRange.max - viewport.priceRange.min;
        const dPrice = -dy / viewport.priceHeight * span;
        for (const a of this.anchors) {
            a.index += dIndex;
            a.price += dPrice;
        }
    }

    /**
     * Draw the text label above the drawing if showText is on.
     */
    _drawTextLabel(ctx, x, y, theme) {
        if (!this.showText || !this.text) return;
        ctx.save();
        ctx.font = `${this.fontSize}px 'Inter', sans-serif`;
        const m = ctx.measureText(this.text);
        const w = m.width + 10, h = this.fontSize + 6;
        ctx.fillStyle = this._withAlpha(this.color, 0.9);
        ctx.fillRect(x - w / 2, y - h - 4, w, h);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, x, y - h / 2 - 4);
        ctx.restore();
    }

    // ---- Subclass hooks ----
    onPointerDown(x, y, viewport) {}
    onPointerMove(x, y, viewport) {}
    onPointerUp(x, y, viewport) {}
    draw(ctx, viewport, theme) {}
    hitTest(x, y, viewport) { return false; }

    /**
     * Return a plain options object for serialization.
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            anchors: this.anchors.map(a => ({ ...a })),
            color: this.color,
            fillColor: this.fillColor,
            lineWidth: this.lineWidth,
            lineStyle: this.lineStyle,
            opacity: this.opacity,
            text: this.text,
            showText: this.showText,
            extend: this.extend,
            showLabels: this.showLabels,
            fontSize: this.fontSize
        };
    }
}
DrawingBase._idCounter = 1;
