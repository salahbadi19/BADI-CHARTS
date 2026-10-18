/**
 * Arrow.js - Arrow line between two points with arrowhead.
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

export class Arrow extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'arrow';
        this.color = opts.color || '#EA3943';
        this.arrowSize = opts.arrowSize || 12;
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
        const angle = Math.atan2(dy, dx);
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return;
        // Shorten line so it ends at the arrow base
        const x2 = p2.x - Math.cos(angle) * this.arrowSize * 0.6;
        const y2 = p2.y - Math.sin(angle) * this.arrowSize * 0.6;
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        this._applyLineStyle(ctx);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y);
        ctx.lineTo(p2.x - this.arrowSize * Math.cos(angle - 0.4), p2.y - this.arrowSize * Math.sin(angle - 0.4));
        ctx.lineTo(p2.x - this.arrowSize * Math.cos(angle + 0.4), p2.y - this.arrowSize * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
        if (this.showText) this._drawTextLabel(ctx, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 14, theme);
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
