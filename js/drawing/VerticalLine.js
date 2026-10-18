/**
 * VerticalLine.js - Vertical line at a specific bar index, spanning the chart height.
 */
import { DrawingBase } from './DrawingBase.js';

export class VerticalLine extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'vline';
        this.color = opts.color || '#ff9800';
        this.lineStyle = opts.lineStyle || 'dashed';
    }
    onPointerDown(x, y, vp) {
        if (this.anchors.length === 0) {
            this.anchors.push(this._screenToAnchor(x, y, vp));
            this.isComplete = true;
        }
    }
    onPointerMove(x, y, vp) {}
    onPointerUp(x, y, vp) {}
    draw(ctx, vp, theme) {
        if (!this.visible || this.anchors.length < 1) return;
        const x = vp.indexToX(this.anchors[0].index) + vp.barSpacing / 2;
        if (x < 0 || x > vp.width - 70) return;
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        this._applyLineStyle(ctx);
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, vp.priceHeight);
        ctx.stroke();
        ctx.setLineDash([]);
        if (this.showText) this._drawTextLabel(ctx, x, 12, theme);
        if (this.isSelected || this.isHovered) this._drawHandle(ctx, x, vp.priceHeight / 2, theme);
        ctx.restore();
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 1) return false;
        const lineX = vp.indexToX(this.anchors[0].index) + vp.barSpacing / 2;
        return Math.abs(x - lineX) <= this._hitTolerance && y < vp.priceHeight;
    }
}
