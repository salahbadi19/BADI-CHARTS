/**
 * RayLine.js - A line that starts at one point and extends infinitely through a second point.
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

export class RayLine extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'ray';
        this.color = opts.color || '#12C4F0';
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
            if (Math.abs(this.anchors[0].index - this.anchors[1].index) > 0.3) this.isComplete = true;
        }
    }
    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 2) return;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
        // Extend to the right edge
        let x2 = p2.x, y2 = p2.y;
        if (dx > 0.01) {
            const t = (vp.width - 70 - p1.x) / dx;
            x2 = p1.x + dx * t;
            y2 = p1.y + dy * t;
        }
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        this._applyLineStyle(ctx);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        if (this.showText) this._drawTextLabel(ctx, p2.x, p2.y - 10, theme);
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
        const d = this._ptSegDist(x, y, p1.x, p1.y, p2.x, p2.y);
        return d <= this._hitTolerance;
    }
    _ptSegDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        if (len2 === 0) return MathUtils.distance(px, py, x1, y1);
        let t = ((px - x1) * dx + (py - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        return MathUtils.distance(px, py, x1 + t * dx, y1 + t * dy);
    }
}
