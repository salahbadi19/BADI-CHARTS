/**
 * Brush.js - Freehand drawing. Captures all pointer positions as anchors.
 */
import { DrawingBase } from './DrawingBase.js';

export class Brush extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'brush';
        this.color = opts.color || '#ff9800';
        this.lineWidth = opts.lineWidth || 2;
    }
    onPointerDown(x, y, vp) {
        if (this.anchors.length === 0) {
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.isComplete = false;
        }
    }
    onPointerMove(x, y, vp) {
        if (!this.isComplete) {
            this.anchors.push(this._screenToAnchor(x, y, vp));
        }
    }
    onPointerUp(x, y, vp) {
        if (!this.isComplete) {
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.isComplete = true;
        }
    }
    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 2) return;
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        const p0 = this._anchorToScreen(this.anchors[0], vp);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < this.anchors.length; i++) {
            const p = this._anchorToScreen(this.anchors[i], vp);
            ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        if (this.isSelected || this.isHovered) {
            // Show handles at the endpoints only
            this._drawHandle(ctx, p0.x, p0.y, theme);
            const pLast = this._anchorToScreen(this.anchors[this.anchors.length - 1], vp);
            this._drawHandle(ctx, pLast.x, pLast.y, theme);
        }
        ctx.restore();
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 2) return false;
        for (let i = 1; i < this.anchors.length; i++) {
            const p1 = this._anchorToScreen(this.anchors[i - 1], vp);
            const p2 = this._anchorToScreen(this.anchors[i], vp);
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            const len2 = dx * dx + dy * dy;
            if (len2 === 0) continue;
            let t = ((x - p1.x) * dx + (y - p1.y) * dy) / len2;
            t = Math.max(0, Math.min(1, t));
            const cx = p1.x + t * dx, cy = p1.y + t * dy;
            const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
            if (d2 <= this._hitTolerance * this._hitTolerance) return true;
        }
        return false;
    }
}
