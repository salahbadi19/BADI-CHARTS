/**
 * Pitchfork.js - Andrews Pitchfork: 3 anchors (A=low, B=high, C=low) forming a median line + two parallel lines.
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

export class Pitchfork extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'pitchfork';
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
        // Median: from p1 through midpoint of p2-p3
        const midX = (p2.x + p3.x) / 2, midY = (p2.y + p3.y) / 2;
        const dx = midX - p1.x, dy = midY - p1.y;
        // Extend median far to the right
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const ux = dx / len, uy = dy / len;
        const farX = p1.x + ux * 5000;
        const farY = p1.y + uy * 5000;
        // Upper/lower parallel lines through p2 and p3
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        this._applyLineStyle(ctx);
        // Median
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(farX, farY);
        ctx.stroke();
        // Upper (through p2)
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x + (farX - midX), p2.y + (farY - midY));
        ctx.stroke();
        // Lower (through p3)
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p3.x + (farX - midX), p3.y + (farY - midY));
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
        const midX = (p2.x + p3.x) / 2, midY = (p2.y + p3.y) / 2;
        return this._segDist(x, y, p1.x, p1.y, midX, midY) <= this._hitTolerance ||
               this._segDist(x, y, p2.x, p2.y, p2.x + 1000, p2.y) <= this._hitTolerance ||
               this._segDist(x, y, p3.x, p3.y, p3.x + 1000, p3.y) <= this._hitTolerance;
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
