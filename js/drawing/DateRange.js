/**
 * DateRange.js - Highlights a date range with a vertical band.
 */
import { DrawingBase } from './DrawingBase.js';

export class DateRange extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'daterange';
        this.fillColor = opts.fillColor || opts.color || '#12C4F0';
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
        const x = Math.min(p1.x, p2.x);
        const w = Math.abs(p2.x - p1.x);
        ctx.save();
        ctx.fillStyle = this._withAlpha(this.fillColor, 0.1 * this.opacity);
        ctx.fillRect(x, 0, w, vp.priceHeight);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.x + 0.5, 0); ctx.lineTo(p1.x + 0.5, vp.priceHeight);
        ctx.moveTo(p2.x + 0.5, 0); ctx.lineTo(p2.x + 0.5, vp.priceHeight);
        ctx.stroke();
        ctx.setLineDash([]);
        if (this.isSelected || this.isHovered || !this.isComplete) {
            this._drawHandle(ctx, p1.x, vp.priceHeight / 2, theme);
            this._drawHandle(ctx, p2.x, vp.priceHeight / 2, theme);
        }
        ctx.restore();
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 2) return false;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const minX = Math.min(p1.x, p2.x), maxX = Math.max(p1.x, p2.x);
        return x >= minX - this._hitTolerance && x <= maxX + this._hitTolerance && y < vp.priceHeight;
    }
}
