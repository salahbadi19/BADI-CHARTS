/**
 * Rectangle.js - Rectangle with two anchors. Used for zones, ranges, etc.
 */
import { DrawingBase } from './DrawingBase.js';

export class Rectangle extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'rectangle';
        this.color = opts.color || '#12C4F0';
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
        const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);
        ctx.save();
        ctx.globalAlpha = this.opacity;
        if (this.fillColor) ctx.fillStyle = this._withAlpha(this.fillColor, 0.15);
        else ctx.fillStyle = this._withAlpha(this.color, 0.15);
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        this._applyLineStyle(ctx);
        ctx.strokeRect(x + 0.5, y + 0.5, w, h);
        ctx.setLineDash([]);
        if (this.showText) this._drawTextLabel(ctx, x + w / 2, y, theme);
        if (this.isSelected || this.isHovered || !this.isComplete) {
            this._drawHandle(ctx, p1.x, p1.y, theme);
            this._drawHandle(ctx, p2.x, p2.y, theme);
            this._drawHandle(ctx, p1.x, p2.y, theme);
            this._drawHandle(ctx, p2.x, p1.y, theme);
        }
        ctx.restore();
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 2) return false;
        const p1 = this._anchorToScreen(this.anchors[0], vp);
        const p2 = this._anchorToScreen(this.anchors[1], vp);
        const minX = Math.min(p1.x, p2.x), maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y), maxY = Math.max(p1.y, p2.y);
        const tol = this._hitTolerance;
        const onL = Math.abs(x - minX) <= tol && y >= minY - tol && y <= maxY + tol;
        const onR = Math.abs(x - maxX) <= tol && y >= minY - tol && y <= maxY + tol;
        const onT = Math.abs(y - minY) <= tol && x >= minX - tol && x <= maxX + tol;
        const onB = Math.abs(y - maxY) <= tol && x >= minX - tol && x <= maxX + tol;
        return onL || onR || onT || onB;
    }
}
