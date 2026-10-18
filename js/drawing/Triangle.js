/**
 * Triangle.js - Triangle with three anchors.
 */
import { DrawingBase } from './DrawingBase.js';

export class Triangle extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'triangle';
        this.fillColor = opts.fillColor || opts.color || '#12C4F0';
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
        if (!this.isComplete && this.anchors[this._step]) {
            this.anchors[this._step] = this._screenToAnchor(x, y, vp);
        }
    }
    onPointerUp(x, y, vp) {}
    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 3) return;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const p3 = this._anchorToScreen(this.anchors[2], vp);
        ctx.save();
        ctx.fillStyle = this._withAlpha(this.fillColor, 0.15 * this.opacity);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        this._applyLineStyle(ctx);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        if (this.showText) this._drawTextLabel(ctx, (p1.x + p2.x + p3.x) / 3, (p1.y + p2.y + p3.y) / 3, theme);
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
        // Barycentric technique for point-in-triangle
        const d = (p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y);
        if (d === 0) return false;
        const a = ((p2.y - p3.y) * (x - p3.x) + (p3.x - p2.x) * (y - p3.y)) / d;
        const b = ((p3.y - p1.y) * (x - p3.x) + (p1.x - p3.x) * (y - p3.y)) / d;
        const c = 1 - a - b;
        return a >= 0 && b >= 0 && c >= 0;
    }
}
