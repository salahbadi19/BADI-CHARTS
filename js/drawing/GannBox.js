/**
 * GannBox.js - Gann Box: square box with fib-like horizontal/vertical divisions.
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

export class GannBox extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'gannbox';
        this.fillColor = opts.fillColor || opts.color || '#9c27b0';
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
        const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this._withAlpha(this.fillColor, 0.06 * this.opacity);
        ctx.lineWidth = this.lineWidth;
        this._applyLineStyle(ctx);
        ctx.fillRect(x, y, w, h);
        // Divide into 8 horizontal/vertical sections
        ctx.strokeStyle = this._withAlpha(this.color, 0.4);
        for (let i = 1; i < 8; i++) {
            const ty = y + (h / 8) * i;
            const tx = x + (w / 8) * i;
            ctx.beginPath();
            ctx.moveTo(x, ty); ctx.lineTo(x + w, ty);
            ctx.moveTo(tx, y); ctx.lineTo(tx, y + h);
            ctx.stroke();
        }
        // Main border
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        ctx.strokeRect(x + 0.5, y + 0.5, w, h);
        ctx.setLineDash([]);
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
        const minX = Math.min(p1.x, p2.x), maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y), maxY = Math.max(p1.y, p2.y);
        const onEdge = (Math.abs(x - minX) <= this._hitTolerance || Math.abs(x - maxX) <= this._hitTolerance) && y >= minY - this._hitTolerance && y <= maxY + this._hitTolerance
            || (Math.abs(y - minY) <= this._hitTolerance || Math.abs(y - maxY) <= this._hitTolerance) && x >= minX - this._hitTolerance && x <= maxX + this._hitTolerance;
        return onEdge;
    }
}
