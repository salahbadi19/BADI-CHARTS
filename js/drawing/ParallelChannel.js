/**
 * ParallelChannel.js - Two parallel lines defined by 3 anchors.
 * Anchors: top-left, top-right, bottom-left (defines channel width).
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

export class ParallelChannel extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'channel';
        this.fillColor = opts.fillColor || opts.color || '#12C4F0';
        this._step = 1;
    }
    onPointerDown(x, y, vp) {
        if (this.anchors.length === 0) {
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.isComplete = false;
            this._step = 1;
        } else if (!this.isComplete && this._step < 3) {
            this.anchors[this._step] = this._screenToAnchor(x, y, vp);
            this._step++;
            if (this._step === 3) this.isComplete = true;
        }
    }
    onPointerMove(x, y, vp) {
        if (!this.isComplete && this.anchors[this._step]) this.anchors[this._step] = this._screenToAnchor(x, y, vp);
    }
    onPointerUp(x, y, vp) {}
    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 3) return;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const p3 = this._anchorToScreen(this.anchors[2], vp);
        const offset = { x: p3.x - p1.x, y: p3.y - p1.y };
        ctx.save();
        ctx.fillStyle = this._withAlpha(this.fillColor, 0.1 * this.opacity);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        this._applyLineStyle(ctx);
        // Fill channel
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p2.x + offset.x, p2.y + offset.y);
        ctx.lineTo(p1.x + offset.x, p1.y + offset.y);
        ctx.closePath();
        ctx.fill();
        // Lines
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.moveTo(p1.x + offset.x, p1.y + offset.y); ctx.lineTo(p2.x + offset.x, p2.y + offset.y);
        ctx.stroke();
        ctx.setLineDash([]);
        if (this.isSelected || this.isHovered || !this.isComplete) {
            this._drawHandle(ctx, p1.x, p1.y, theme);
            this._drawHandle(ctx, p2.x, p2.y, theme);
            this._drawHandle(ctx, p3.x, p3.y, theme);
        }
        ctx.restore();
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 3) return false;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const p3 = this._anchorToScreen(this.anchors[2], vp);
        const offset = { x: p3.x - p1.x, y: p3.y - p1.y };
        const d1 = this._segDist(x, y, p1.x, p1.y, p2.x, p2.y);
        const d2 = this._segDist(x, y, p1.x + offset.x, p1.y + offset.y, p2.x + offset.x, p2.y + offset.y);
        return d1 <= this._hitTolerance || d2 <= this._hitTolerance;
    }
    _segDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return MathUtils.distance(px, py, x1, y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        return MathUtils.distance(px, py, x1 + t * dx, y1 + t * dy);
    }
}
