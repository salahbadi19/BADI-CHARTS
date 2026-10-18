/**
 * HorizontalLine.js - Horizontal line at a specific price, full chart width.
 */
import { DrawingBase } from './DrawingBase.js';
import { MathUtils } from '../utils/MathUtils.js';

export class HorizontalLine extends DrawingBase {
    constructor(opts = {}) {
        super(opts);
        this.type = 'hline';
        this.color = opts.color || '#ff9800';
        this.lineStyle = opts.lineStyle || 'dashed';
        this.showLabels = opts.showLabels !== false;
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
        const y = vp.priceToY(this.anchors[0].price);
        if (y < 0 || y > vp.priceHeight) return;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth + (this.isSelected ? 1 : 0);
        this._applyLineStyle(ctx);
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(vp.width - 70, y + 0.5);
        ctx.stroke();
        ctx.setLineDash([]);
        if (this.showLabels) {
            const label = MathUtils.formatPrice(this.anchors[0].price);
            ctx.font = "bold 11px 'JetBrains Mono', monospace";
            const m = ctx.measureText(label);
            const w = m.width + 12, h = 18;
            const x = vp.width - 70;
            ctx.fillStyle = this.color;
            ctx.fillRect(x, y - h / 2, w, h);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x + w / 2, y);
        }
        if (this.showText) this._drawTextLabel(ctx, vp.width / 2, y - 14, theme);
        if (this.isSelected || this.isHovered) this._drawHandle(ctx, 0, y, theme);
        ctx.restore();
    }
    hitTest(x, y, vp) {
        if (!this.visible || this.anchors.length < 1) return false;
        const lineY = vp.priceToY(this.anchors[0].price);
        return Math.abs(y - lineY) <= this._hitTolerance && x < vp.width - 70;
    }
}
