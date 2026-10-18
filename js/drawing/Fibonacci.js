/**
 * Fibonacci.js — Fibonacci retracement with FULLY editable levels.
 *
 * The user can:
 *   - Add / remove levels via the settings card (this.levels array).
 *   - Edit each level's ratio (the 'l' field) and color ('c' field).
 *   - Drag individual level lines vertically (each level's price is
 *     computed from anchor1 + (anchor2 - anchor1) * level, but the user
 *     can override a level's ratio by dragging it).
 *
 * The default levels match the classic Fib retracement set.
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

const DEFAULT_LEVELS = [
    { l: 0,     c: '#888888', label: '0' },
    { l: 0.236, c: '#EA3943', label: '0.236' },
    { l: 0.382, c: '#FF9800', label: '0.382' },
    { l: 0.5,   c: '#4CAF50', label: '0.5' },
    { l: 0.618, c: '#16C784', label: '0.618' },
    { l: 0.786, c: '#12C4F0', label: '0.786' },
    { l: 1,     c: '#888888', label: '1' },
    { l: 1.618, c: '#9C27B0', label: '1.618' },
    { l: 2.618, c: '#673AB7', label: '2.618' }
];

export class Fibonacci extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'fibonacci';
        this.lineWidth = opts.lineWidth || 1;
        this.showLabels = opts.showLabels !== false;
        // Per-level overrides (color + ratio). The user can edit this array
        // via the settings card to add/remove/reorder levels.
        this.levels = opts.levels || DEFAULT_LEVELS.map(l => ({ ...l }));
        // The currently-dragged level index (or -1).
        this._dragLevelIdx = -1;
    }

    onPointerDown(x, y, vp) {
        if (this.anchors.length === 0) {
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.isComplete = false;
        }
    }
    onPointerMove(x, y, vp) {
        if (!this.isComplete && this.anchors.length === 2) {
            this.anchors[1] = this._screenToAnchor(x, y, vp);
        }
    }
    onPointerUp(x, y, vp) {
        if (!this.isComplete) {
            this.anchors[1] = this._screenToAnchor(x, y, vp);
            this.isComplete = true;
        }
    }

    /**
     * Hit-test against a level LINE (for drag-to-edit-ratio).
     * Returns { levelIdx } if hit, or null.
     */
    hitTestLevel(x, y, vp) {
        if (!this.visible || this.anchors.length < 2) return -1;
        if (x >= vp.width - 70) return -1;
        const price1 = this.anchors[0].price, price2 = this.anchors[1].price;
        for (let i = 0; i < this.levels.length; i++) {
            const fl = this.levels[i];
            const price = price1 + (price2 - price1) * fl.l;
            const lineY = vp.priceToY(price);
            if (Math.abs(y - lineY) <= this._hitTolerance) return i;
        }
        return -1;
    }

    /**
     * Drag a level's ratio by computing the new price and back-solving for
     * the ratio that would place the level there.
     */
    setLevelRatio(idx, y, vp) {
        if (idx < 0 || idx >= this.levels.length) return;
        if (this.anchors.length < 2) return;
        const price1 = this.anchors[0].price, price2 = this.anchors[1].price;
        const span = price2 - price1;
        if (Math.abs(span) < 1e-9) return;
        const newPrice = vp.yToPrice(y);
        const newRatio = (newPrice - price1) / span;
        this.levels[idx].l = newRatio;
        this.levels[idx].label = newRatio.toFixed(3);
    }

    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 2) return;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const price1 = this.anchors[0].price, price2 = this.anchors[1].price;
        const xLeft = Math.min(p1.x, p2.x);
        const xRight = vp.width - 70;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.font = "10px 'JetBrains Mono', monospace";
        for (let i = 0; i < this.levels.length; i++) {
            const fl = this.levels[i];
            const price = price1 + (price2 - price1) * fl.l;
            const y = vp.priceToY(price);
            ctx.strokeStyle = fl.c;
            ctx.lineWidth = (fl.l === 0.618 || fl.l === 0.5) ? this.lineWidth + 0.5 : this.lineWidth;
            this._applyLineStyle(ctx);
            ctx.beginPath();
            ctx.moveTo(xLeft, y + 0.5);
            ctx.lineTo(xRight, y + 0.5);
            ctx.stroke();
            ctx.setLineDash([]);
            if (this.showLabels) {
                const lblTxt = (fl.label || (fl.l * 100).toFixed(1) + '%') + '  ' + MathUtils.formatPrice(price);
                const m = ctx.measureText(lblTxt);
                const w = m.width + 10, h = 14;
                ctx.fillStyle = fl.c;
                ctx.fillRect(xRight - w, y - h / 2, w, h);
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(lblTxt, xRight - 5, y);
            }
        }
        if (this.isSelected || this.isHovered || !this.isComplete) {
            this._drawHandle(ctx, p1.x, p1.y, theme);
            this._drawHandle(ctx, p2.x, p2.y, theme);
        }
        ctx.restore();
    }

    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 2) return false;
        if (x >= vp.width - 70) return false;
        const price1 = this.anchors[0].price, price2 = this.anchors[1].price;
        for (const fl of this.levels) {
            const lineY = vp.priceToY(price1 + (price2 - price1) * fl.l);
            if (Math.abs(y - lineY) <= this._hitTolerance) return true;
        }
        return false;
    }

    toJSON() {
        const json = super.toJSON();
        json.levels = this.levels.map(l => ({ ...l }));
        json.direction = this.direction;
        return json;
    }
}
