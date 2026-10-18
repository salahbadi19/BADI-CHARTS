/**
 * Measurement.js - Two-point measurement showing distance, bars, % change.
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

export class Measurement extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'measurement';
        this.color = opts.color || '#ffeb3b';
    }
    onPointerDown(x, y, vp) {
        if (this.anchors.length === 0) {
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.isComplete = false;
        }
    }
    onPointerMove(x, y, vp) {
        if (!this.isComplete && this.anchors.length === 2) this.anchors[1] = this._screenToAnchor(x, y, vp);
    }
    onPointerUp(x, y, vp) {
        if (!this.isComplete) {
            this.anchors[1] = this._screenToAnchor(x, y, vp);
            this.isComplete = true;
        }
    }
    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 2) return;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const bars = Math.abs(this.anchors[1].index - this.anchors[0].index);
        const priceDiff = this.anchors[1].price - this.anchors[0].price;
        const pct = (priceDiff / this.anchors[0].price) * 100;
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Label box
        const txt = `${bars.toFixed(0)} bars · ${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(4)} (${pct.toFixed(2)}%)`;
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        const m = ctx.measureText(txt);
        const lx = (p1.x + p2.x) / 2 - (m.width + 12) / 2;
        const ly = (p1.y + p2.y) / 2 - 10;
        ctx.fillStyle = this.color;
        ctx.fillRect(lx, ly, m.width + 12, 18);
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, lx + (m.width + 12) / 2, ly + 9);
        if (this.isSelected || this.isHovered || !this.isComplete) {
            this._drawHandle(ctx, p1.x, p1.y, theme);
            this._drawHandle(ctx, p2.x, p2.y, theme);
        }
        ctx.restore();
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 2) return false;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return MathUtils.distance(x, y, p1.x, p1.y) <= this._hitTolerance;
        let t = ((x - p1.x) * dx + (y - p1.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        return MathUtils.distance(x, y, p1.x + t * dx, p1.y + t * dy) <= this._hitTolerance;
    }
}
